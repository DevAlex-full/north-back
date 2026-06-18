import { FastifyRequest, FastifyReply } from 'fastify'
import { ScheduleService } from '../services/schedule.service'
import { idParamSchema } from '../validators/common.validator'
import {
  createScheduleBlockSchema,
  updateScheduleBlockSchema,
  scheduleQuerySchema,
} from '../validators/schedule.validator'

const service = new ScheduleService()

export const scheduleController = {
  async getAll(req: FastifyRequest, rep: FastifyReply) {
    const { dayOfWeek } = scheduleQuerySchema.parse(req.query)
    return rep.send(await service.getBlocks(req.userId, dayOfWeek))
  },
  async getOne(req: FastifyRequest, rep: FastifyReply) {
    const { id } = idParamSchema.parse(req.params)
    return rep.send(await service.getBlock(req.userId, id))
  },
  async create(req: FastifyRequest, rep: FastifyReply) {
    const data = createScheduleBlockSchema.parse(req.body)
    return rep.status(201).send(await service.createBlock(req.userId, data))
  },
  async update(req: FastifyRequest, rep: FastifyReply) {
    const { id } = idParamSchema.parse(req.params)
    const data = updateScheduleBlockSchema.parse(req.body)
    return rep.send(await service.updateBlock(req.userId, id, data))
  },
  async delete(req: FastifyRequest, rep: FastifyReply) {
    const { id } = idParamSchema.parse(req.params)
    await service.deleteBlock(req.userId, id)
    return rep.status(204).send()
  },
}
