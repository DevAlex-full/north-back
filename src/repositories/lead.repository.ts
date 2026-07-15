import { prisma } from '../lib/prisma'

/**
 * Fase 5.4 — Normaliza nome de empresa para comparação de idempotência
 * (Opção A, sem migration/coluna nova): minúsculas, sem acento, sem
 * pontuação — só letras/números separados por espaço único. Mesmo
 * espírito da normalização já usada em produção pelo north-SDR-Back.
 */
function normalizeCompanyName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export class LeadRepository {
  async findMany(userId: string, status?: string) {
    return prisma.lead.findMany({
      where: { userId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findById(id: string, userId: string) {
    return prisma.lead.findFirst({ where: { id, userId } })
  }

  async create(data: any) { return prisma.lead.create({ data }) }

  async update(id: string, data: any) { return prisma.lead.update({ where: { id }, data }) }

  async delete(id: string) { return prisma.lead.delete({ where: { id } }) }

  /**
   * Fase 4.3 — Busca leads com followUpAt vencido ou dentro da janela
   * até `until`. Exclui ACTIVE_CLIENT e LOST (não precisam de follow-up).
   */
  async findFollowUps(userId: string, from: Date, until: Date) {
    return prisma.lead.findMany({
      where: {
        userId,
        status:     { notIn: ['ACTIVE_CLIENT', 'LOST'] },
        followUpAt: { lte: until },
      },
      orderBy: { followUpAt: 'asc' },
    })
  }

  /**
   * Fase 5.4 — Busca um lead do usuário para fins de idempotência da
   * integração North SDR (Opção A, aprovada: sem migration/coluna nova).
   * Ordem de resolução: 1) `instagram` exato, quando informado; 2) nome
   * da empresa normalizado, igual. Retorna `null` se nada bater — quem
   * chama decide criar um lead novo nesse caso.
   *
   * É uma busca em memória (sem índice dedicado no banco) sobre os leads
   * do usuário — aceitável na escala atual do projeto; se o volume
   * crescer muito, a Opção B (coluna `externalId` única) resolveria isso
   * com uma query indexada, mas isso ficou fora do escopo aprovado agora.
   */
  async findForIdempotency(userId: string, params: { instagram?: string; companyName?: string }) {
    if (params.instagram) {
      const byInstagram = await prisma.lead.findFirst({
        where: { userId, instagram: params.instagram },
      })
      if (byInstagram) return byInstagram
    }

    if (params.companyName) {
      const normalized = normalizeCompanyName(params.companyName)
      const candidates = await prisma.lead.findMany({
        where: { userId, company: { not: null } },
      })
      const match = candidates.find((lead) => lead.company && normalizeCompanyName(lead.company) === normalized)
      if (match) return match
    }

    return null
  }
}