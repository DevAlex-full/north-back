import { Prisma } from '@prisma/client'
import { ActivityRepository } from '../repositories/activity.repository'

const repo = new ActivityRepository()

export class ActivityService {
  async getActivities(userId: string, filters?: { leadId?: string; projectId?: string }) {
    return repo.findMany(userId, filters)
  }

  async createActivity(
    userId: string,
    data: {
      leadId?: string
      projectId?: string
      type: string
      title: string
      description?: string
      source?: string
      metadata?: Prisma.InputJsonValue
      occurredAt?: string
    },
  ) {
    return repo.create({
      userId,
      leadId: data.leadId,
      projectId: data.projectId,
      type: data.type,
      title: data.title,
      description: data.description,
      source: data.source ?? 'MANUAL',
      metadata: data.metadata,
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
    })
  }

  async updateActivity(
    userId: string,
    id: string,
    data: {
      title?: string
      description?: string
      metadata?: Prisma.InputJsonValue
      occurredAt?: string
    },
  ) {
    const existing = await repo.findById(id, userId)
    if (!existing) throw { statusCode: 404, message: 'Atividade não encontrada' }

    return repo.update(id, {
      title: data.title,
      description: data.description,
      metadata: data.metadata,
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
    })
  }

  async deleteActivity(userId: string, id: string) {
    const existing = await repo.findById(id, userId)
    if (!existing) throw { statusCode: 404, message: 'Atividade não encontrada' }

    return repo.delete(id)
  }
}