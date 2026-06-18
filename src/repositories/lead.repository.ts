import { prisma } from '../lib/prisma'

export class LeadRepository {
  async findMany(userId: string, status?: string) {
    return prisma.lead.findMany({ where: { userId, ...(status ? { status } : {}) }, orderBy: { createdAt: 'desc' } })
  }
  async findById(id: string, userId: string) { return prisma.lead.findFirst({ where: { id, userId } }) }
  async create(data: any) { return prisma.lead.create({ data }) }
  async update(id: string, data: any) { return prisma.lead.update({ where: { id }, data }) }
  async delete(id: string) { return prisma.lead.delete({ where: { id } }) }
}
