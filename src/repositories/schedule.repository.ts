import { prisma } from '../lib/prisma'

export class ScheduleRepository {
  async findBlocks(userId: string, dayOfWeek?: number) {
    return prisma.scheduleBlock.findMany({
      where: { userId, isActive: true, ...(dayOfWeek !== undefined ? { dayOfWeek: { has: dayOfWeek } } : {}) },
      orderBy: { startTime: 'asc' }
    })
  }
  async findBlockById(id: string, userId: string) { return prisma.scheduleBlock.findFirst({ where: { id, userId } }) }
  async createBlock(data: any) { return prisma.scheduleBlock.create({ data }) }
  async updateBlock(id: string, data: any) { return prisma.scheduleBlock.update({ where: { id }, data }) }
  async deleteBlock(id: string) { return prisma.scheduleBlock.delete({ where: { id } }) }
}
