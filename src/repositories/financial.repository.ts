import { prisma } from '../lib/prisma'
import { parseDateOnlySP } from '../utils/date-sp'

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

  /**
   * Correção funcional — `endDate` agora é sempre um limite EXCLUSIVO
   * (início do dia seguinte ao último dia do período), calculado via
   * `utils/date-sp.ts`. Usa `lt` em vez do antigo `lte` com
   * `23:59:59.999` — mais correto e independente de precisão de
   * milissegundos.
   */
  async getSummary(userId: string, startDate: Date, endDate: Date) {
    const transactions = await prisma.financialTransaction.findMany({
      where: { userId, date: { gte: startDate, lt: endDate } }
    })
    const income = transactions.filter((t: any) => t.type === 'INCOME').reduce((s: number, t: any) => s + t.amount, 0)
    const expense = transactions.filter((t: any) => t.type === 'EXPENSE').reduce((s: number, t: any) => s + t.amount, 0)
    return { income, expense, profit: income - expense }
  }

  /**
   * Todas as transações do usuário dentro de um intervalo [start, end)
   * de instantes, com a categoria incluída — usado pela reconciliação da
   * Meta Indrive (`FinancialService.reconcileDailyGoalFromTransactions`),
   * que precisa do nome da categoria para classificar Indrive/Gasolina.
   */
  async findTransactionsInRange(userId: string, start: Date, end: Date) {
    return prisma.financialTransaction.findMany({
      where: { userId, date: { gte: start, lt: end } },
      include: { category: true },
    })
  }

  /** `dateStr` é sempre uma data civil "YYYY-MM-DD" em America/Sao_Paulo — nunca um `Date` com `setHours()`. */
  async findDailyGoal(userId: string, dateStr: string) {
    const day = parseDateOnlySP(dateStr)
    return prisma.dailyGoal.findUnique({ where: { userId_date: { userId, date: day } } })
  }

  /**
   * Upsert do registro consolidado de `DailyGoal` — sempre com os quatro
   * campos já calculados (nunca parcial), pois `earnedAmount`/`gasAmount`
   * deixaram de ser editáveis manualmente (ver
   * `FinancialService.reconcileDailyGoalFromTransactions`).
   */
  async upsertDailyGoalRecord(
    userId: string,
    dateStr: string,
    data: { targetAmount: number; earnedAmount: number; gasAmount: number; status: string }
  ) {
    const day = parseDateOnlySP(dateStr)
    return prisma.dailyGoal.upsert({
      where: { userId_date: { userId, date: day } },
      create: { userId, date: day, ...data },
      update: data,
    })
  }

  /**
   * Correção (Bloqueio 2) — `endDate` agora é sempre um limite EXCLUSIVO
   * (início do dia civil seguinte ao último dia do histórico, calculado
   * em `FinancialService.getDailyGoalHistory` via `getDayRangeSP`), então
   * a consulta usa `lt`, não `lte`.
   */
  async findDailyGoals(userId: string, startDate: Date, endDate: Date) {
    return prisma.dailyGoal.findMany({ where: { userId, date: { gte: startDate, lt: endDate } }, orderBy: { date: 'desc' } })
  }

  /** Fallback de `targetAmount` quando não há `DailyGoal` nem edição manual anterior para o dia. */
  async findUserSettings(userId: string) {
    return prisma.userSettings.findUnique({ where: { userId } })
  }
}