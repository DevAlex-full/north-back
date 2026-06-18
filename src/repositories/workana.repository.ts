import { prisma } from '../lib/prisma'

export class WorkanaRepository {
  async findMany(userId: string) { return prisma.workanaProposal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }) }
  async findById(id: string, userId: string) { return prisma.workanaProposal.findFirst({ where: { id, userId } }) }
  async create(data: any) { return prisma.workanaProposal.create({ data }) }
  async update(id: string, data: any) { return prisma.workanaProposal.update({ where: { id }, data }) }
  async delete(id: string) { return prisma.workanaProposal.delete({ where: { id } }) }
  async countThisWeek(userId: string) {
    const now = new Date()
    const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0)
    return prisma.workanaProposal.count({ where: { userId, createdAt: { gte: start } } })
  }
}
