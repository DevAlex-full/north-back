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

  async createTask(userId: string, projectId: string, data: any) {
    await this.getProject(userId, projectId)
    return repo.createTask({ ...data, projectId, dueDate: data.dueDate ? new Date(data.dueDate) : undefined })
  }

  async updateTask(userId: string, id: string, data: any) {
    if (data.status === 'DONE') data.completedAt = new Date()
    return repo.updateTask(id, data)
  }

  async deleteTask(userId: string, id: string) { return repo.deleteTask(id) }

  // --- Fase 4.3: Subtarefas ---

  async createSubTask(userId: string, taskId: string, data: { title: string; order: number }) {
    const task = await repo.findTaskById(taskId)
    if (!task) throw { statusCode: 404, message: 'Tarefa não encontrada' }
    return repo.createSubTask({ taskId, title: data.title, order: data.order ?? 0 })
  }

  async updateSubTask(userId: string, subId: string, data: { title?: string; status?: string; order?: number }) {
    const completedAt = data.status === 'DONE' ? new Date() : data.status === 'PENDING' ? null : undefined
    return repo.updateSubTask(subId, {
      title:       data.title,
      status:      data.status,
      order:       data.order,
      ...(completedAt !== undefined ? { completedAt } : {}),
    })
  }

  async deleteSubTask(userId: string, subId: string) {
    return repo.deleteSubTask(subId)
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