import { prisma } from '../lib/prisma'

export class JobRepository {
  async findMany(userId: string) { return prisma.jobApplication.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }) }
  async findById(id: string, userId: string) { return prisma.jobApplication.findFirst({ where: { id, userId } }) }
  async create(data: any) { return prisma.jobApplication.create({ data }) }
  async update(id: string, data: any) { return prisma.jobApplication.update({ where: { id }, data }) }
  async delete(id: string) { return prisma.jobApplication.delete({ where: { id } }) }
}
