import { FastifyRequest, FastifyReply } from 'fastify'
import { GoalService } from '../services/goal.service'
import { idParamSchema } from '../validators/common.validator'
import { createGoalSchema, updateGoalSchema } from '../validators/goal.validator'

const service = new GoalService()

export const goalController = {
  async getAll(req: FastifyRequest, rep: FastifyReply) {
    return rep.send(await service.getGoals(req.userId))
  },
  async getOne(req: FastifyRequest, rep: FastifyReply) {
    const { id } = idParamSchema.parse(req.params)
    return rep.send(await service.getGoal(req.userId, id))
  },
  async create(req: FastifyRequest, rep: FastifyReply) {
    const data = createGoalSchema.parse(req.body)
    return rep.status(201).send(await service.createGoal(req.userId, data))
  },
  async update(req: FastifyRequest, rep: FastifyReply) {
    const { id } = idParamSchema.parse(req.params)
    const data = updateGoalSchema.parse(req.body)
    return rep.send(await service.updateGoal(req.userId, id, data))
  },
  async delete(req: FastifyRequest, rep: FastifyReply) {
    const { id } = idParamSchema.parse(req.params)
    await service.deleteGoal(req.userId, id)
    return rep.status(204).send()
  },
}
