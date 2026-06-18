import { FinancialRepository } from '../repositories/financial.repository'

const repo = new FinancialRepository()

export class FinancialService {
  async getCategories(userId: string) {
    return repo.findCategories(userId)
  }

  async createCategory(userId: string, data: any) {
    return repo.createCategory({ ...data, userId })
  }

  async updateCategory(userId: string, id: string, data: any) {
    const cat = await repo.findCategoryById(id, userId)
    if (!cat) throw { statusCode: 404, message: 'Categoria não encontrada' }
    return repo.updateCategory(id, data)
  }

  async deleteCategory(userId: string, id: string) {
    const cat = await repo.findCategoryById(id, userId)
    if (!cat) throw { statusCode: 404, message: 'Categoria não encontrada' }
    return repo.deleteCategory(id)
  }

  async getTransactions(userId: string, filters?: { startDate?: string; endDate?: string; type?: string }) {
    return repo.findTransactions(userId, {
      startDate: filters?.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters?.endDate ? new Date(filters.endDate) : undefined,
      type: filters?.type,
    })
  }

  async createTransaction(userId: string, data: any) {
    return repo.createTransaction({ ...data, userId, date: data.date ? new Date(data.date) : new Date() })
  }

  async updateTransaction(userId: string, id: string, data: any) {
    const t = await repo.findTransactionById(id, userId)
    if (!t) throw { statusCode: 404, message: 'Transação não encontrada' }
    return repo.updateTransaction(id, data)
  }

  async deleteTransaction(userId: string, id: string) {
    const t = await repo.findTransactionById(id, userId)
    if (!t) throw { statusCode: 404, message: 'Transação não encontrada' }
    return repo.deleteTransaction(id)
  }

  async getSummary(userId: string, period: 'day' | 'week' | 'month') {
    const now = new Date()
    let startDate: Date, endDate: Date = new Date(now)
    endDate.setHours(23, 59, 59, 999)

    if (period === 'day') {
      startDate = new Date(now); startDate.setHours(0, 0, 0, 0)
    } else if (period === 'week') {
      startDate = new Date(now); startDate.setDate(now.getDate() - now.getDay()); startDate.setHours(0, 0, 0, 0)
      endDate = new Date(startDate); endDate.setDate(startDate.getDate() + 6); endDate.setHours(23, 59, 59, 999)
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    }
    return repo.getSummary(userId, startDate, endDate)
  }

  async getDailyGoal(userId: string, date: string) {
    return repo.findDailyGoal(userId, new Date(date))
  }

  async updateDailyGoal(userId: string, date: string, data: any) {
    const goal = await repo.upsertDailyGoal(userId, new Date(date), data)
    // Calculate status
    const netProfit = (goal.earnedAmount || 0) - (goal.gasAmount || 0)
    let status = 'BELOW'
    if (netProfit >= goal.targetAmount) status = 'REACHED'
    else if (netProfit >= goal.targetAmount * 0.8) status = 'ALMOST'
    return repo.upsertDailyGoal(userId, new Date(date), { ...data, status })
  }

  async getDailyGoalHistory(userId: string, startDate: string, endDate: string) {
    return repo.findDailyGoals(userId, new Date(startDate), new Date(endDate))
  }

  getSuggestion(amount: number) {
    return {
      amount,
      despesas: Math.round(amount * 0.7 * 100) / 100,
      reserva: Math.round(amount * 0.2 * 100) / 100,
      investimento: Math.round(amount * 0.1 * 100) / 100,
    }
  }
}
