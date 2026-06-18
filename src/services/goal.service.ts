import { GoalRepository } from '../repositories/goal.repository'
const repo = new GoalRepository()

export class GoalService {
  async getGoals(userId: string) { return repo.findMany(userId) }

  async getGoal(userId: string, id: string) {
    const g = await repo.findById(id, userId)
    if (!g) throw { statusCode: 404, message: 'Meta não encontrada' }
    return g
  }

  async createGoal(userId: string, data: any) {
    return repo.create({ ...data, userId, deadline: data.deadline ? new Date(data.deadline) : undefined })
  }

  async updateGoal(userId: string, id: string, data: any) {
    await this.getGoal(userId, id)
    const updated = await repo.update(id, { ...data, deadline: data.deadline ? new Date(data.deadline) : undefined })
    if (updated.current >= updated.target && updated.status === 'ACTIVE') {
      return repo.update(id, { status: 'COMPLETED' })
    }
    return updated
  }

  async deleteGoal(userId: string, id: string) {
    await this.getGoal(userId, id)
    return repo.delete(id)
  }
}
