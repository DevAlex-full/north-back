import { prisma } from '../lib/prisma'

export class ProjectRepository {
  async findMany(userId: string, kind?: string) {
    return prisma.project.findMany({
      where: { userId, ...(kind ? { kind } : {}) },
      include: { projectTasks: { orderBy: { priority: 'asc' } } },
      orderBy: [{ priority: 'asc' }],
    })
  }
  async findById(id: string, userId: string) { return prisma.project.findFirst({ where: { id, userId }, include: { projectTasks: true } }) }
  async create(data: any) { return prisma.project.create({ data, include: { projectTasks: true } }) }
  async update(id: string, data: any) { return prisma.project.update({ where: { id }, data, include: { projectTasks: true } }) }
  async delete(id: string) { return prisma.project.delete({ where: { id } }) }
  async createTask(data: any) { return prisma.projectTask.create({ data }) }
  async updateTask(id: string, data: any) { return prisma.projectTask.update({ where: { id }, data }) }
  async deleteTask(id: string) { return prisma.projectTask.delete({ where: { id } }) }

  /**
   * Soma das transações financeiras vinculadas a um projeto, por tipo
   * (INCOME ou EXPENSE). Usado para calcular "recebido"/"pendente"/"gasto"
   * de um projeto de cliente sem persistir um valor derivado — a fonte da
   * verdade continua sendo o ledger em FinancialTransaction.
   */
  async sumTransactionsByProject(projectId: string, type: 'INCOME' | 'EXPENSE'): Promise<number> {
    const result = await prisma.financialTransaction.aggregate({
      where: { projectId, type },
      _sum: { amount: true },
    })
    return result._sum.amount || 0
  }
}