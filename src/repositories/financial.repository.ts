import { prisma } from '../lib/prisma'
import { parseDateOnlySP } from '../utils/date-sp'

/**
 * Correção de compatibilidade de deploy — `FinancialRepository` é a
 * ÚNICA camada que sabe que a coluna física em `daily_goals` ainda se
 * chama `gasAmount` (dívida semântica temporária, documentada em
 * `prisma/schema.prisma`, preservada de propósito para não exigir uma
 * janela de rollout incompatível entre migration e deploy do backend).
 * Todo o domínio acima do repository (service, controller, API,
 * frontend) só conhece `expenseAmount` — nunca precisa pensar em
 * `gasAmount`.
 */
function toDomainDailyGoal<T extends { gasAmount: number }>(
  row: T
): Omit<T, 'gasAmount'> & { expenseAmount: number } {
  const { gasAmount, ...rest } = row
  return { ...rest, expenseAmount: gasAmount }
}

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

  /**
   * `dateStr` é sempre uma data civil "YYYY-MM-DD" em America/Sao_Paulo
   * — nunca um `Date` com `setHours()`. Retorna a forma de domínio
   * (`expenseAmount`), traduzida a partir da coluna física `gasAmount`.
   */
  async findDailyGoal(userId: string, dateStr: string) {
    const day = parseDateOnlySP(dateStr)
    const row = await prisma.dailyGoal.findUnique({ where: { userId_date: { userId, date: day } } })
    return row ? toDomainDailyGoal(row) : null
  }

  /**
   * Upsert do registro consolidado de `DailyGoal` — sempre com os quatro
   * campos já calculados (nunca parcial), pois `earnedAmount`/`expenseAmount`
   * deixaram de ser editáveis manualmente (ver
   * `FinancialService.reconcileDailyGoalFromTransactions`).
   *
   * Recebe e devolve `expenseAmount` (nome de domínio); só aqui dentro
   * ele é traduzido para a coluna física `gasAmount` na escrita.
   */
  async upsertDailyGoalRecord(
    userId: string,
    dateStr: string,
    data: { targetAmount: number; earnedAmount: number; expenseAmount: number; status: string }
  ) {
    const day = parseDateOnlySP(dateStr)
    const { expenseAmount, ...rest } = data
    const dbData = { ...rest, gasAmount: expenseAmount }
    const row = await prisma.dailyGoal.upsert({
      where: { userId_date: { userId, date: day } },
      create: { userId, date: day, ...dbData },
      update: dbData,
    })
    return toDomainDailyGoal(row)
  }

  /**
   * Correção (Bloqueio 2) — `endDate` agora é sempre um limite EXCLUSIVO
   * (início do dia civil seguinte ao último dia do histórico, calculado
   * em `FinancialService.getDailyGoalHistory` via `getDayRangeSP`), então
   * a consulta usa `lt`, não `lte`. Retorna a forma de domínio
   * (`expenseAmount`) para cada registro do histórico.
   */
  async findDailyGoals(userId: string, startDate: Date, endDate: Date) {
    const rows = await prisma.dailyGoal.findMany({ where: { userId, date: { gte: startDate, lt: endDate } }, orderBy: { date: 'desc' } })
    return rows.map(toDomainDailyGoal)
  }

  /** Fallback de `targetAmount` quando não há `DailyGoal` nem edição manual anterior para o dia. */
  async findUserSettings(userId: string) {
    return prisma.userSettings.findUnique({ where: { userId } })
  }
}