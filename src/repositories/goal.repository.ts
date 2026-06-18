import { prisma } from '../lib/prisma'

export class GoalRepository {
  async findMany(userId: string) { return prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }) }
  async findById(id: string, userId: string) { return prisma.goal.findFirst({ where: { id, userId } }) }
  async create(data: any) { return prisma.goal.create({ data }) }
  async update(id: string, data: any) { return prisma.goal.update({ where: { id }, data }) }
  async delete(id: string) { return prisma.goal.delete({ where: { id } }) }
}
