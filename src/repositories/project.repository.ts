import { prisma } from '../lib/prisma'

export class ProjectRepository {
  async findMany(userId: string) {
    return prisma.project.findMany({ where: { userId }, include: { projectTasks: { orderBy: { priority: 'asc' } } }, orderBy: [{ priority: 'asc' }] })
  }
  async findById(id: string, userId: string) { return prisma.project.findFirst({ where: { id, userId }, include: { projectTasks: true } }) }
  async create(data: any) { return prisma.project.create({ data, include: { projectTasks: true } }) }
  async update(id: string, data: any) { return prisma.project.update({ where: { id }, data, include: { projectTasks: true } }) }
  async delete(id: string) { return prisma.project.delete({ where: { id } }) }
  async createTask(data: any) { return prisma.projectTask.create({ data }) }
  async updateTask(id: string, data: any) { return prisma.projectTask.update({ where: { id }, data }) }
  async deleteTask(id: string) { return prisma.projectTask.delete({ where: { id } }) }
}
