import { LeadRepository } from '../repositories/lead.repository'

const repo = new LeadRepository()

export class LeadService {
  async getLeads(userId: string, status?: string) { return repo.findMany(userId, status) }

  async getLead(userId: string, id: string) {
    const lead = await repo.findById(id, userId)
    if (!lead) throw { statusCode: 404, message: 'Lead não encontrado' }
    return lead
  }

  async createLead(userId: string, data: any) { return repo.create({ ...data, userId }) }

  async updateLead(userId: string, id: string, data: any) {
    await this.getLead(userId, id)
    return repo.update(id, {
      ...data,
      lastContactAt: data.lastContactAt ? new Date(data.lastContactAt) : undefined,
      followUpAt:    data.followUpAt    ? new Date(data.followUpAt)    : undefined,
    })
  }

  async deleteLead(userId: string, id: string) {
    await this.getLead(userId, id)
    return repo.delete(id)
  }

  /**
   * Fase 4.3 — Follow-ups: retorna leads do usuário cujo followUpAt está
   * vencido ou vence nos próximos dias (padrão: 7 dias). Exclui leads
   * já finalizados (ACTIVE_CLIENT / LOST).
   */
  async getFollowUps(userId: string, days: number = 7) {
    const now  = new Date()
    const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
    return repo.findFollowUps(userId, now, until)
  }
}