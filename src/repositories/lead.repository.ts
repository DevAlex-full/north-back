import { prisma } from '../lib/prisma'

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
}