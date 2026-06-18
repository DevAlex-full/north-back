import { prisma } from '../lib/prisma'

export class TaskRepository {
  async findMany(userId: string, filters?: { date?: Date; status?: string }) {
    const where: any = { userId }
    if (filters?.date) {
      const start = new Date(filters.date); start.setHours(0, 0, 0, 0)
      const end = new Date(filters.date); end.setHours(23, 59, 59, 999)
      where.date = { gte: start, lte: end }
    }
    if (filters?.status) where.status = filters.status
    return prisma.task.findMany({ where, orderBy: [{ priority: 'asc' }, { date: 'asc' }] })
  }

  async findById(id: string, userId: string) {
    return prisma.task.findFirst({ where: { id, userId } })
  }

  async create(data: any) {
    return prisma.task.create({ data })
  }

  async update(id: string, _userId: string, data: any) {
    return prisma.task.update({ where: { id }, data })
  }

  async delete(id: string, _userId: string) {
    return prisma.task.delete({ where: { id } })
  }

  async countByDate(userId: string, date: Date) {
    const start = new Date(date); start.setHours(0, 0, 0, 0)
    const end = new Date(date); end.setHours(23, 59, 59, 999)
    const total = await prisma.task.count({ where: { userId, date: { gte: start, lte: end } } })
    const done = await prisma.task.count({ where: { userId, date: { gte: start, lte: end }, status: 'DONE' } })
    return { total, done }
  }
}
