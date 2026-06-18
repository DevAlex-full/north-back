import { WorkanaRepository } from '../repositories/workana.repository'
const repo = new WorkanaRepository()

export class WorkanaService {
  async getProposals(userId: string) { return repo.findMany(userId) }

  async getProposal(userId: string, id: string) {
    const p = await repo.findById(id, userId)
    if (!p) throw { statusCode: 404, message: 'Proposta não encontrada' }
    return p
  }

  async createProposal(userId: string, data: any) {
    return repo.create({ ...data, userId, sentAt: data.sentAt ? new Date(data.sentAt) : undefined })
  }

  async updateProposal(userId: string, id: string, data: any) {
    await this.getProposal(userId, id)
    return repo.update(id, { ...data, sentAt: data.sentAt ? new Date(data.sentAt) : undefined })
  }

  async deleteProposal(userId: string, id: string) {
    await this.getProposal(userId, id)
    return repo.delete(id)
  }

  async getWeekCount(userId: string) { return repo.countThisWeek(userId) }
}
