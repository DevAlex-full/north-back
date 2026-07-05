import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'

const taskInclude = {
  projectTasks: {
    orderBy: { priority: 'asc' as const },
    include: {
      subtasks: {
        orderBy: { order: 'asc' as const },
      },
    },
  },
} satisfies Prisma.ProjectInclude

export class ProjectRepository {
  async findMany(userId: string, kind?: string) {
    return prisma.project.findMany({
      where: { userId, ...(kind ? { kind } : {}) },
      include: taskInclude,
      orderBy: [{ priority: 'asc' }],
    })
  }

  async findById(id: string, userId: string) {
    return prisma.project.findFirst({
      where: { id, userId },
      include: taskInclude,
    })
  }

  async create(data: Prisma.ProjectUncheckedCreateInput) {
    return prisma.project.create({
      data,
      include: taskInclude,
    })
  }

  async update(id: string, data: Prisma.ProjectUncheckedUpdateInput) {
    return prisma.project.update({
      where: { id },
      data,
      include: taskInclude,
    })
  }

  async delete(id: string) {
    return prisma.project.delete({
      where: { id },
    })
  }

  async createTask(data: Prisma.ProjectTaskUncheckedCreateInput) {
    return prisma.projectTask.create({ data })
  }

  async updateTask(id: string, data: Prisma.ProjectTaskUncheckedUpdateInput) {
    return prisma.projectTask.update({
      where: { id },
      data,
    })
  }

  async deleteTask(id: string) {
    return prisma.projectTask.delete({
      where: { id },
    })
  }

  async findTaskById(id: string) {
    return prisma.projectTask.findUnique({
      where: { id },
      include: {
        subtasks: {
          orderBy: { order: 'asc' },
        },
      },
    })
  }

  async createSubTask(data: Prisma.ProjectSubTaskUncheckedCreateInput) {
    return prisma.projectSubTask.create({ data })
  }

  async updateSubTask(id: string, data: Prisma.ProjectSubTaskUncheckedUpdateInput) {
    return prisma.projectSubTask.update({
      where: { id },
      data,
    })
  }

  async deleteSubTask(id: string) {
    return prisma.projectSubTask.delete({
      where: { id },
    })
  }

  async sumTransactionsByProject(projectId: string, type: 'INCOME' | 'EXPENSE'): Promise<number> {
    const result = await prisma.financialTransaction.aggregate({
      where: { projectId, type },
      _sum: { amount: true },
    })

    return result._sum.amount || 0
  }
}