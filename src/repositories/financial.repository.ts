import { prisma } from '../lib/prisma'

export class FinancialRepository {
  async findCategories(userId: string) {
    return prisma.financialCategory.findMany({ where: { userId }, orderBy: { name: 'asc' } })
  }

  async findCategoryById(id: string, userId: string) {
    return prisma.financialCategory.findFirst({ where: { id, userId } })
  }

  async createCategory(data: any) { return prisma.financialCategory.create({ data }) }
  async updateCategory(id: string, data: any) { return prisma.financialCategory.update({ where: { id }, data }) }
  async deleteCategory(id: string) { return prisma.financialCategory.delete({ where: { id } }) }

  async findTransactions(userId: string, filters?: { startDate?: Date; endDate?: Date; type?: string; projectId?: string }) {
    const where: any = { userId }
    if (filters?.startDate && filters?.endDate) where.date = { gte: filters.startDate, lte: filters.endDate }
    if (filters?.type) where.type = filters.type
    if (filters?.projectId) where.projectId = filters.projectId
    return prisma.financialTransaction.findMany({ where, orderBy: { date: 'desc' }, include: { category: true } })
  }

  async findTransactionById(id: string, userId: string) {
    return prisma.financialTransaction.findFirst({ where: { id, userId }, include: { category: true } })
  }

  async createTransaction(data: any) { return prisma.financialTransaction.create({ data, include: { category: true } }) }
  async updateTransaction(id: string, data: any) { return prisma.financialTransaction.update({ where: { id }, data, include: { category: true } }) }
  async deleteTransaction(id: string) { return prisma.financialTransaction.delete({ where: { id } }) }

  async getSummary(userId: string, startDate: Date, endDate: Date) {
    const transactions = await prisma.financialTransaction.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } }
    })
    const income = transactions.filter((t: any) => t.type === 'INCOME').reduce((s: number, t: any) => s + t.amount, 0)
    const expense = transactions.filter((t: any) => t.type === 'EXPENSE').reduce((s: number, t: any) => s + t.amount, 0)
    return { income, expense, profit: income - expense }
  }

  async findDailyGoal(userId: string, date: Date) {
    const start = new Date(date); start.setHours(0, 0, 0, 0)
    const end = new Date(date); end.setHours(23, 59, 59, 999)
    return prisma.dailyGoal.findFirst({ where: { userId, date: { gte: start, lte: end } } })
  }

  async upsertDailyGoal(userId: string, date: Date, data: any) {
    const dayDate = new Date(date); dayDate.setHours(0, 0, 0, 0)
    return prisma.dailyGoal.upsert({
      where: { userId_date: { userId, date: dayDate } },
      create: { userId, date: dayDate, targetAmount: data.targetAmount ?? 150, earnedAmount: data.earnedAmount ?? 0, gasAmount: data.gasAmount ?? 0, status: data.status ?? 'BELOW' },
      update: data,
    })
  }

  async findDailyGoals(userId: string, startDate: Date, endDate: Date) {
    return prisma.dailyGoal.findMany({ where: { userId, date: { gte: startDate, lte: endDate } }, orderBy: { date: 'desc' } })
  }
}