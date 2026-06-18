import { prisma } from '../lib/prisma'

export class ContentRepository {
  async findMany(userId: string, platform?: string) {
    return prisma.contentPlan.findMany({ where: { userId, ...(platform ? { platform } : {}) }, orderBy: { scheduledFor: 'asc' } })
  }
  async findById(id: string, userId: string) { return prisma.contentPlan.findFirst({ where: { id, userId } }) }
  async create(data: any) { return prisma.contentPlan.create({ data }) }
  async update(id: string, data: any) { return prisma.contentPlan.update({ where: { id }, data }) }
  async delete(id: string) { return prisma.contentPlan.delete({ where: { id } }) }
}
