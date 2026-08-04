import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'

type DatabaseClient = Prisma.TransactionClient | typeof prisma

const taskInclude = {
  projectTasks: {
    orderBy: { priority: 'asc' as const },
    include: {
      subtasks: {
        orderBy: { order: 'asc' as const },
      },
    },
  },
} satisfies Prisma.ProjectInclude

const subtasksOrderBy = [
  { order: 'asc' as const },
  { createdAt: 'asc' as const },
]

export class ProjectRepository {
  async findMany(userId: string, kind?: string) {
    return prisma.project.findMany({
      where: { userId, ...(kind ? { kind } : {}) },
      include: taskInclude,
      orderBy: [{ priority: 'asc' }],
    })
  }

  async findById(id: string, userId: string) {
    return prisma.project.findFirst({
      where: { id, userId },
      include: taskInclude,
    })
  }

  async create(data: Prisma.ProjectUncheckedCreateInput) {
    return prisma.project.create({
      data,
      include: taskInclude,
    })
  }

  async update(id: string, data: Prisma.ProjectUncheckedUpdateInput) {
    return prisma.project.update({
      where: { id },
      data,
      include: taskInclude,
    })
  }

  async delete(id: string) {
    return prisma.project.delete({
      where: { id },
    })
  }

  /**
   * Fase 6.1.6 — executor transacional. Apenas delega para
   * `prisma.$transaction`, sem engolir erros: qualquer exceção lançada
   * dentro de `operation` propaga naturalmente e reverte a transação.
   */
  async runInTransaction<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return prisma.$transaction(operation)
  }

  /**
   * Busca segura de tarefa (etapa). Comprova simultaneamente
   * task.id, task.projectId e task.project.userId na própria consulta,
   * e já inclui as subtarefas ordenadas deterministicamente
   * (order, createdAt).
   */
  async findOwnedTask(
    userId: string,
    projectId: string,
    taskId: string,
    db?: DatabaseClient
  ) {
    const client = db ?? prisma
    return client.projectTask.findFirst({
      where: {
        id: taskId,
        projectId,
        project: { userId },
      },
      include: {
        subtasks: {
          orderBy: subtasksOrderBy,
        },
      },
    })
  }

  /**
   * Busca segura de subtarefa. Comprova toda a cadeia
   * subtask.id / subtask.taskId / subtask.task.projectId / subtask.task.project.userId.
   */
  async findOwnedSubTask(
    userId: string,
    projectId: string,
    taskId: string,
    subId: string,
    db?: DatabaseClient
  ) {
    const client = db ?? prisma
    return client.projectSubTask.findFirst({
      where: {
        id: subId,
        taskId,
        task: {
          projectId,
          project: { userId },
        },
      },
    })
  }

  /**
   * Busca consolidada da tarefa (etapa) com subtarefas ordenadas,
   * sem revalidar ownership — usada ao final dos algoritmos
   * transacionais, quando a ownership já foi comprovada anteriormente
   * na mesma transação.
   */
  async findTaskWithSubtasks(taskId: string, db?: DatabaseClient) {
    const client = db ?? prisma
    return client.projectTask.findUnique({
      where: { id: taskId },
      include: {
        subtasks: {
          orderBy: subtasksOrderBy,
        },
      },
    })
  }

  async createTask(data: Prisma.ProjectTaskUncheckedCreateInput, db?: DatabaseClient) {
    const client = db ?? prisma
    return client.projectTask.create({
      data,
      include: {
        subtasks: {
          orderBy: subtasksOrderBy,
        },
      },
    })
  }

  async updateTask(id: string, data: Prisma.ProjectTaskUncheckedUpdateInput, db?: DatabaseClient) {
    const client = db ?? prisma
    return client.projectTask.update({
      where: { id },
      data,
    })
  }

  async deleteTask(id: string, db?: DatabaseClient) {
    const client = db ?? prisma
    return client.projectTask.delete({
      where: { id },
    })
  }

  async createSubTask(data: Prisma.ProjectSubTaskUncheckedCreateInput, db?: DatabaseClient) {
    const client = db ?? prisma
    return client.projectSubTask.create({ data })
  }

  async updateSubTask(id: string, data: Prisma.ProjectSubTaskUncheckedUpdateInput, db?: DatabaseClient) {
    const client = db ?? prisma
    return client.projectSubTask.update({
      where: { id },
      data,
    })
  }

  async deleteSubTask(id: string, db?: DatabaseClient) {
    const client = db ?? prisma
    return client.projectSubTask.delete({
      where: { id },
    })
  }

  /**
   * Atualização em lote das subtarefas de uma tarefa — usada, por
   * exemplo, ao reabrir uma etapa inteira para PENDING.
   */
  async updateManySubTasksByTaskId(
    taskId: string,
    data: Prisma.ProjectSubTaskUpdateManyMutationInput,
    db?: DatabaseClient
  ) {
    const client = db ?? prisma
    return client.projectSubTask.updateMany({
      where: { taskId },
      data,
    })
  }

  /**
   * Conclui somente as subtarefas de uma tarefa ainda não concluídas,
   * preenchendo um único `completedAt` para todas — usada ao concluir
   * uma etapa que possui subtarefas, preservando o timestamp das que
   * já estavam DONE.
   */
  async completeOpenSubTasksByTaskId(
    taskId: string,
    completedAt: Date,
    db?: DatabaseClient
  ) {
    const client = db ?? prisma
    return client.projectSubTask.updateMany({
      where: { taskId, status: { not: 'DONE' } },
      data: { status: 'DONE', completedAt },
    })
  }

  async sumTransactionsByProject(projectId: string, type: 'INCOME' | 'EXPENSE'): Promise<number> {
    const result = await prisma.financialTransaction.aggregate({
      where: { projectId, type },
      _sum: { amount: true },
    })

    return result._sum.amount || 0
  }
}