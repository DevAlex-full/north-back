import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'

export class ActivityRepository {
  async findMany(userId: string, filters?: { leadId?: string; projectId?: string }) {
    return prisma.activityLog.findMany({
      where: {
        userId,
        ...(filters?.leadId ? { leadId: filters.leadId } : {}),
        ...(filters?.projectId ? { projectId: filters.projectId } : {}),
      },
      orderBy: { occurredAt: 'desc' },
    })
  }

  async findById(id: string, userId: string) {
    return prisma.activityLog.findFirst({ where: { id, userId } })
  }

  async create(data: {
    userId: string
    leadId?: string
    projectId?: string
    type: string
    title: string
    description?: string
    source: string
    metadata?: Prisma.InputJsonValue
    occurredAt: Date
  }) {
    return prisma.activityLog.create({ data })
  }

  async update(
    id: string,
    data: {
      title?: string
      description?: string
      metadata?: Prisma.InputJsonValue
      occurredAt?: Date
    },
  ) {
    return prisma.activityLog.update({ where: { id }, data })
  }

  async delete(id: string) {
    return prisma.activityLog.delete({ where: { id } })
  }
}