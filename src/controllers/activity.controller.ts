import { Prisma } from '@prisma/client'
import { FastifyRequest, FastifyReply } from 'fastify'
import { ActivityService } from '../services/activity.service'
import { idParamSchema } from '../validators/common.validator'
import { createActivitySchema, updateActivitySchema, activityQuerySchema } from '../validators/activity.validator'

const service = new ActivityService()

export const activityController = {
  async getAll(req: FastifyRequest, rep: FastifyReply) {
    const { leadId, projectId } = activityQuerySchema.parse(req.query)
    return rep.send(await service.getActivities(req.userId, { leadId, projectId }))
  },

  async create(req: FastifyRequest, rep: FastifyReply) {
    const data = createActivitySchema.parse(req.body)

    return rep.status(201).send(
      await service.createActivity(req.userId, {
        ...data,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      }),
    )
  },

  async update(req: FastifyRequest, rep: FastifyReply) {
    const { id } = idParamSchema.parse(req.params)
    const data = updateActivitySchema.parse(req.body)

    return rep.send(
      await service.updateActivity(req.userId, id, {
        ...data,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      }),
    )
  },

  async delete(req: FastifyRequest, rep: FastifyReply) {
    const { id } = idParamSchema.parse(req.params)
    await service.deleteActivity(req.userId, id)
    return rep.status(204).send()
  },
}