import { Prisma } from '@prisma/client'
import { ProjectRepository } from '../repositories/project.repository'
import { LeadRepository } from '../repositories/lead.repository'
import { ActivityRepository } from '../repositories/activity.repository'

const repo = new ProjectRepository()
const leadRepo = new LeadRepository()
const activityRepo = new ActivityRepository()

/**
 * Fase 4.4B — mapeamento de transições de `clientStatus` que representam
 * um marco comercial relevante o bastante para virar um ActivityLog
 * automático na timeline do projeto. `LEAD`, `PAUSED_CLIENT` e
 * `CANCELLED` ficam de fora intencionalmente: não existe um ActivityType
 * que descreva esses estados sem forçar um significado que eles não têm
 * (o enum inteiro descreve avanços comerciais concretos).
 */
const PROJECT_STATUS_ACTIVITY: Record<string, { type: string; title: string }> = {
  PROPOSAL:    { type: 'PROPOSAL_SENT',       title: 'Proposta enviada' },
  NEGOTIATION: { type: 'NEGOTIATION_STARTED', title: 'Negociação iniciada' },
  CLOSED:      { type: 'DEAL_CLOSED',         title: 'Negócio fechado' },
  DEVELOPMENT: { type: 'PROJECT_STARTED',     title: 'Projeto iniciado' },
  DELIVERED:   { type: 'DELIVERY_MADE',       title: 'Projeto entregue' },
  SUPPORT:     { type: 'SUPPORT_STARTED',     title: 'Suporte iniciado' },
}

interface UpdateTaskInput {
  title?: string
  description?: string
  status?: 'PENDING' | 'IN_PROGRESS' | 'DONE'
  priority?: number
  dueDate?: string
}

interface UpdateSubTaskInput {
  title?: string
  status?: 'PENDING' | 'DONE'
  order?: number
}

export class ProjectService {
  async getProjects(userId: string, kind?: string) { return repo.findMany(userId, kind) }

  async getProject(userId: string, id: string) {
    const p = await repo.findById(id, userId)
    if (!p) throw { statusCode: 404, message: 'Projeto não encontrado' }
    return p
  }

  private async assertClientOwnership(userId: string, clientId?: string | null) {
    if (!clientId) return
    const lead = await leadRepo.findById(clientId, userId)
    if (!lead) throw { statusCode: 404, message: 'Cliente (lead) não encontrado' }
  }

  async createProject(userId: string, data: any) {
    await this.assertClientOwnership(userId, data.clientId)
    return repo.create({ ...data, userId, deadline: data.deadline ? new Date(data.deadline) : undefined })
  }

  async updateProject(userId: string, id: string, data: any) {
    const before = await this.getProject(userId, id)
    if (data.clientId !== undefined) await this.assertClientOwnership(userId, data.clientId)
    const updated = await repo.update(id, { ...data, deadline: data.deadline ? new Date(data.deadline) : undefined })
    await this.logClientStatusActivityIfNeeded(userId, before, updated)
    return updated
  }

  /**
   * Fase 4.4B — Ao mudar o `clientStatus` de um projeto de cliente para um
   * marco comercial mapeado, cria automaticamente um ActivityLog
   * (source: AUTO) preso ao projeto e, se o projeto tiver `clientId`,
   * também ao lead correspondente. Só dispara quando o `clientStatus`
   * realmente mudou de valor (compara `before` vs `after`) — updates que
   * tocam outros campos sem mexer no status não geram evento, e um mesmo
   * status re-salvo também não duplica nada. Não dispara para projetos
   * pessoais (`kind !== 'CLIENT'`).
   */
  private async logClientStatusActivityIfNeeded(
    userId: string,
    before: { clientStatus?: string | null },
    after: { id: string; name: string; kind: string; clientStatus?: string | null; clientId?: string | null }
  ) {
    if (after.kind !== 'CLIENT') return
    if (!after.clientStatus || before.clientStatus === after.clientStatus) return

    const mapping = PROJECT_STATUS_ACTIVITY[after.clientStatus]
    if (!mapping) return

    await activityRepo.create({
      userId,
      projectId: after.id,
      ...(after.clientId ? { leadId: after.clientId } : {}),
      type: mapping.type,
      title: mapping.title,
      description: `Projeto "${after.name}" mudou o status comercial para "${mapping.title}".`,
      source: 'AUTO',
      occurredAt: new Date(),
    })
  }

  async deleteProject(userId: string, id: string) {
    await this.getProject(userId, id)
    return repo.delete(id)
  }

  // --- Fase 6.1.6: Etapas (ProjectTask) com ownership e consistência ---

  async createTask(userId: string, projectId: string, data: any) {
    const project = await repo.findById(projectId, userId)
    if (!project) throw { statusCode: 404, message: 'Projeto não encontrado' }

    const status = data.status ?? 'PENDING'
    const completedAt = status === 'DONE' ? new Date() : null

    return repo.createTask({
      ...data,
      status,
      completedAt,
      projectId,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    })
  }

  async updateTask(userId: string, projectId: string, taskId: string, data: UpdateTaskInput) {
    const { status, ...rest } = data

    if (status === undefined) {
      return this.updateTaskFieldsOnly(userId, projectId, taskId, rest)
    }

    if (status === 'DONE') {
      return this.completeTask(userId, projectId, taskId, rest)
    }

    if (status === 'PENDING') {
      return this.reopenTask(userId, projectId, taskId, rest)
    }

    if (status === 'IN_PROGRESS') {
      return this.markTaskInProgress(userId, projectId, taskId, rest)
    }

    throw { statusCode: 400, message: 'Status inválido' }
  }

  /**
   * Busca a tarefa consolidada (com subtarefas) dentro de uma transação e
   * lança 404 caso não seja encontrada. Usado como retorno padrão de todas
   * as mutações, para que o contrato nunca devolva `ProjectTask | null`.
   */
  private async getConsolidatedTask(taskId: string, tx: Prisma.TransactionClient) {
    const task = await repo.findTaskWithSubtasks(taskId, tx)
    if (!task) throw { statusCode: 404, message: 'Tarefa não encontrada' }
    return task
  }

  /**
   * Atualização de tarefa sem alterar status: só toca os campos
   * presentes no payload, preservando status, completedAt e subtarefas.
   */
  private async updateTaskFieldsOnly(
    userId: string,
    projectId: string,
    taskId: string,
    rest: Omit<UpdateTaskInput, 'status'>
  ) {
    return repo.runInTransaction(async (tx) => {
      const task = await repo.findOwnedTask(userId, projectId, taskId, tx)
      if (!task) throw { statusCode: 404, message: 'Tarefa não encontrada' }

      await repo.updateTask(taskId, this.buildFieldPatch(rest), tx)

      return this.getConsolidatedTask(taskId, tx)
    })
  }

  /**
   * Conclui a etapa (status = DONE). Sem subtarefas, apenas conclui a
   * própria tarefa. Com subtarefas, conclui as ainda abertas usando um
   * único `now` e conclui a tarefa principal — tudo na mesma transação.
   * Timestamps já preenchidos (tarefa ou subtarefas já concluídas) são
   * preservados.
   */
  private async completeTask(
    userId: string,
    projectId: string,
    taskId: string,
    rest: Omit<UpdateTaskInput, 'status'>
  ) {
    return repo.runInTransaction(async (tx) => {
      const task = await repo.findOwnedTask(userId, projectId, taskId, tx)
      if (!task) throw { statusCode: 404, message: 'Tarefa não encontrada' }

      const now = new Date()

      if (task.subtasks.length > 0) {
        await repo.completeOpenSubTasksByTaskId(taskId, now, tx)
      }

      await repo.updateTask(
        taskId,
        {
          ...this.buildFieldPatch(rest),
          status: 'DONE',
          completedAt: task.status === 'DONE' && task.completedAt ? task.completedAt : now,
        },
        tx
      )

      return this.getConsolidatedTask(taskId, tx)
    })
  }

  /**
   * Reabre a etapa (status = PENDING). Reabre também todas as
   * subtarefas, zerando os `completedAt` — tudo na mesma transação.
   */
  private async reopenTask(
    userId: string,
    projectId: string,
    taskId: string,
    rest: Omit<UpdateTaskInput, 'status'>
  ) {
    return repo.runInTransaction(async (tx) => {
      const task = await repo.findOwnedTask(userId, projectId, taskId, tx)
      if (!task) throw { statusCode: 404, message: 'Tarefa não encontrada' }

      if (task.subtasks.length > 0) {
        await repo.updateManySubTasksByTaskId(
          taskId,
          { status: 'PENDING', completedAt: null },
          tx
        )
      }

      await repo.updateTask(
        taskId,
        {
          ...this.buildFieldPatch(rest),
          status: 'PENDING',
          completedAt: null,
        },
        tx
      )

      return this.getConsolidatedTask(taskId, tx)
    })
  }

  /**
   * Move a etapa para IN_PROGRESS. Só é permitido para etapas sem
   * subtarefas — com subtarefas, o status é sempre calculado
   * automaticamente a partir delas, então a mutação explícita é
   * rejeitada com 400 e nenhum registro é alterado.
   */
  private async markTaskInProgress(
    userId: string,
    projectId: string,
    taskId: string,
    rest: Omit<UpdateTaskInput, 'status'>
  ) {
    return repo.runInTransaction(async (tx) => {
      const task = await repo.findOwnedTask(userId, projectId, taskId, tx)
      if (!task) throw { statusCode: 404, message: 'Tarefa não encontrada' }

      if (task.subtasks.length > 0) {
        throw {
          statusCode: 400,
          message: 'Etapas com subtarefas possuem status calculado automaticamente',
        }
      }

      await repo.updateTask(
        taskId,
        {
          ...this.buildFieldPatch(rest),
          status: 'IN_PROGRESS',
          completedAt: null,
        },
        tx
      )

      return this.getConsolidatedTask(taskId, tx)
    })
  }

  /**
   * Monta o patch dos demais campos (título, descrição, prioridade,
   * prazo etc.) sem tocar em status/completedAt, que são controlados
   * separadamente por cada algoritmo transacional.
   */
  private buildFieldPatch(rest: Omit<UpdateTaskInput, 'status'>): Prisma.ProjectTaskUncheckedUpdateInput {
    const patch: Prisma.ProjectTaskUncheckedUpdateInput = {}

    if (rest.title !== undefined) patch.title = rest.title
    if (rest.description !== undefined) patch.description = rest.description
    if (rest.priority !== undefined) patch.priority = rest.priority
    if (rest.dueDate !== undefined) patch.dueDate = rest.dueDate ? new Date(rest.dueDate) : null

    return patch
  }

  async deleteTask(userId: string, projectId: string, taskId: string) {
    const task = await repo.findOwnedTask(userId, projectId, taskId)
    if (!task) throw { statusCode: 404, message: 'Tarefa não encontrada' }
    return repo.deleteTask(taskId)
  }

  // --- Fase 6.1.6: Subtarefas (ProjectSubTask) com ownership e consistência ---

  async createSubTask(userId: string, projectId: string, taskId: string, data: { title: string; order?: number }) {
    return repo.runInTransaction(async (tx) => {
      const task = await repo.findOwnedTask(userId, projectId, taskId, tx)
      if (!task) throw { statusCode: 404, message: 'Tarefa não encontrada' }

      await repo.createSubTask(
        {
          taskId,
          title: data.title,
          order: data.order ?? 0,
          status: 'PENDING',
          completedAt: null,
        },
        tx
      )

      // Fase 6.1.6 (correção) — a etapa deve terminar sempre em PENDING com
      // completedAt = null ao ganhar uma subtarefa pendente, independente
      // do status anterior. Executa incondicionalmente em vez de checar
      // apenas `task.status !== 'PENDING'`, para cobrir também o caso de
      // uma etapa já PENDING que carregue um `completedAt` residual.
      await repo.updateTask(taskId, { status: 'PENDING', completedAt: null }, tx)

      return this.getConsolidatedTask(taskId, tx)
    })
  }

  async updateSubTask(
    userId: string,
    projectId: string,
    taskId: string,
    subId: string,
    data: UpdateSubTaskInput
  ) {
    return repo.runInTransaction(async (tx) => {
      const subtask = await repo.findOwnedSubTask(userId, projectId, taskId, subId, tx)
      if (!subtask) throw { statusCode: 404, message: 'Subtarefa não encontrada' }

      const statusChanged = data.status !== undefined && data.status !== subtask.status

      // Fase 6.1.6 (correção) — um único `now` para toda a operação de
      // mudança de status: usado tanto para concluir a subtarefa quanto,
      // se for o caso, para concluir a tarefa principal na mesma mutação.
      const now = new Date()

      const patch: Prisma.ProjectSubTaskUncheckedUpdateInput = {}
      if (data.title !== undefined) patch.title = data.title
      if (data.order !== undefined) patch.order = data.order

      if (statusChanged) {
        if (data.status === 'DONE') {
          // Este bloco só roda quando o status mudou para DONE, logo a
          // subtarefa não estava DONE antes — não há timestamp residual
          // a preservar aqui.
          patch.status = 'DONE'
          patch.completedAt = now
        } else {
          patch.status = 'PENDING'
          patch.completedAt = null
        }
      }

      await repo.updateSubTask(subId, patch, tx)

      if (!statusChanged) {
        return this.getConsolidatedTask(taskId, tx)
      }

      const currentTask = await this.getConsolidatedTask(taskId, tx)

      const allDone = currentTask.subtasks.every((s) => s.status === 'DONE')

      if (allDone) {
        await repo.updateTask(
          taskId,
          {
            status: 'DONE',
            completedAt:
              currentTask.status === 'DONE' && currentTask.completedAt
                ? currentTask.completedAt
                : now,
          },
          tx
        )
      } else {
        await repo.updateTask(taskId, { status: 'PENDING', completedAt: null }, tx)
      }

      return this.getConsolidatedTask(taskId, tx)
    })
  }

  async deleteSubTask(userId: string, projectId: string, taskId: string, subId: string) {
    return repo.runInTransaction(async (tx) => {
      const subtask = await repo.findOwnedSubTask(userId, projectId, taskId, subId, tx)
      if (!subtask) throw { statusCode: 404, message: 'Subtarefa não encontrada' }

      const taskBefore = await repo.findOwnedTask(userId, projectId, taskId, tx)
      if (!taskBefore) throw { statusCode: 404, message: 'Tarefa não encontrada' }

      const previousStatus = taskBefore.status
      const previousCompletedAt = taskBefore.completedAt

      // Fase 6.1.6 (correção) — um único `now` para toda a operação,
      // usado apenas quando não houver timestamp anterior legítimo (isto
      // é, a tarefa já estava DONE) a preservar.
      const now = new Date()

      await repo.deleteSubTask(subId, tx)

      const remaining = await repo.findTaskWithSubtasks(taskId, tx)
      if (!remaining) throw { statusCode: 404, message: 'Tarefa não encontrada' }

      if (remaining.subtasks.length > 0) {
        const allDone = remaining.subtasks.every((s) => s.status === 'DONE')

        if (allDone) {
          await repo.updateTask(
            taskId,
            {
              status: 'DONE',
              completedAt:
                previousStatus === 'DONE' && previousCompletedAt ? previousCompletedAt : now,
            },
            tx
          )
        } else {
          await repo.updateTask(taskId, { status: 'PENDING', completedAt: null }, tx)
        }
      } else {
        const completedAt =
          previousStatus === 'DONE'
            ? previousCompletedAt ?? now
            : null

        await repo.updateTask(taskId, { status: previousStatus, completedAt }, tx)
      }

      return this.getConsolidatedTask(taskId, tx)
    })
  }

  /**
   * Resumo financeiro de um projeto. Preservado sem alteração da Fase 4.1.
   */
  async getProjectFinance(userId: string, id: string) {
    const project = await this.getProject(userId, id)

    const [received, spent] = await Promise.all([
      repo.sumTransactionsByProject(id, 'INCOME'),
      repo.sumTransactionsByProject(id, 'EXPENSE'),
    ])

    const agreedValue = Number((project as any).agreedValue ?? 0)
    const pending = Math.max(0, agreedValue - received)

    return { agreedValue, received, pending, spent, profit: received - spent }
  }
}