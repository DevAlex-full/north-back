import { LeadRepository } from '../repositories/lead.repository'
import { ActivityRepository } from '../repositories/activity.repository'

const repo = new LeadRepository()
const activityRepo = new ActivityRepository()

/**
 * Fase 4.4B — mapeamento de transições de `status` de Lead que geram um
 * ActivityLog automático. `NEW`, `LOST` e `ACTIVE_CLIENT` ficam de fora,
 * de propósito:
 * - `NEW` é o estado inicial — não é uma transição vinda de outro estado,
 *   então não há "marco" para registrar.
 * - `LOST` não tem contrapartida no enum `ActivityType` (todos os tipos
 *   descrevem avanços comerciais positivos); forçar um `NOTE` genérico
 *   sairia do escopo pedido e teria pouco valor na timeline.
 * - `ACTIVE_CLIENT` é a promoção pós-fechamento: o lead já passou por
 *   `CLOSED` (que já gerou `DEAL_CLOSED`) antes de virar cliente ativo —
 *   logar de novo aqui duplicaria o mesmo marco comercial sob outro rótulo.
 */
const LEAD_STATUS_ACTIVITY: Record<string, { type: string; title: string }> = {
  CONTACTED:     { type: 'CONTACT_MADE',        title: 'Contato realizado' },
  REPLIED:       { type: 'REPLY_RECEIVED',      title: 'Resposta recebida' },
  PROPOSAL_SENT: { type: 'PROPOSAL_SENT',       title: 'Proposta enviada' },
  NEGOTIATION:   { type: 'NEGOTIATION_STARTED', title: 'Negociação iniciada' },
  CLOSED:        { type: 'DEAL_CLOSED',         title: 'Negócio fechado' },
}

export class LeadService {
  async getLeads(userId: string, status?: string) { return repo.findMany(userId, status) }

  async getLead(userId: string, id: string) {
    const lead = await repo.findById(id, userId)
    if (!lead) throw { statusCode: 404, message: 'Lead não encontrado' }
    return lead
  }

  async createLead(userId: string, data: any) { return repo.create({ ...data, userId }) }

  async updateLead(userId: string, id: string, data: any) {
    const before = await this.getLead(userId, id)
    const updated = await repo.update(id, {
      ...data,
      lastContactAt: data.lastContactAt ? new Date(data.lastContactAt) : undefined,
      followUpAt:    data.followUpAt    ? new Date(data.followUpAt)    : undefined,
    })
    await this.logStatusActivityIfNeeded(userId, before, updated)
    return updated
  }

  /**
   * Fase 4.4B — Ao mudar o `status` de um lead para um marco comercial
   * mapeado, cria automaticamente um ActivityLog (source: AUTO) preso ao
   * lead. Só dispara quando o `status` realmente mudou de valor (compara
   * `before` vs `after`) — updates que tocam outros campos sem mexer no
   * status não geram evento, e um mesmo status re-salvo também não
   * duplica nada.
   */
  private async logStatusActivityIfNeeded(
    userId: string,
    before: { status?: string | null },
    after: { id: string; name: string; status?: string | null }
  ) {
    if (!after.status || before.status === after.status) return

    const mapping = LEAD_STATUS_ACTIVITY[after.status]
    if (!mapping) return

    await activityRepo.create({
      userId,
      leadId: after.id,
      type: mapping.type,
      title: mapping.title,
      description: `Lead "${after.name}" mudou o status para "${mapping.title}".`,
      source: 'AUTO',
      occurredAt: new Date(),
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