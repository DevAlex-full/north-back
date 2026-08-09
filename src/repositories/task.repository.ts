import { prisma } from '../lib/prisma'
import { getDayRangeSP } from '../utils/date-sp'

export class TaskRepository {
  /**
   * Correção funcional — `filters.date` é sempre uma data civil
   * "YYYY-MM-DD" (o dia que o usuário selecionou/está vendo), nunca um
   * `Date` já resolvido. O intervalo do dia é sempre calculado em
   * America/Sao_Paulo via `getDayRangeSP`, nunca com `setHours()` (que
   * usa o fuso do servidor — divergente do usuário à noite no Brasil).
   */
  async findMany(userId: string, filters?: { date?: string; status?: string }) {
    const where: any = { userId }
    if (filters?.date) {
      const { start, end } = getDayRangeSP(filters.date)
      where.date = { gte: start, lt: end }
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

  /** `date` é uma data civil "YYYY-MM-DD" — ver nota em `findMany`. */
  async countByDate(userId: string, date: string) {
    const { start, end } = getDayRangeSP(date)
    const total = await prisma.task.count({ where: { userId, date: { gte: start, lt: end } } })
    const done = await prisma.task.count({ where: { userId, date: { gte: start, lt: end }, status: 'DONE' } })
    return { total, done }
  }
}