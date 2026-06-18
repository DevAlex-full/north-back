import { FastifyRequest, FastifyReply } from 'fastify'
import { WorkanaService } from '../services/workana.service'
import { idParamSchema } from '../validators/common.validator'
import { createWorkanaSchema, updateWorkanaSchema } from '../validators/workana.validator'

const service = new WorkanaService()

export const workanaController = {
  async getAll(req: FastifyRequest, rep: FastifyReply) {
    return rep.send(await service.getProposals(req.userId))
  },
  async getOne(req: FastifyRequest, rep: FastifyReply) {
    const { id } = idParamSchema.parse(req.params)
    return rep.send(await service.getProposal(req.userId, id))
  },
  async create(req: FastifyRequest, rep: FastifyReply) {
    const data = createWorkanaSchema.parse(req.body)
    return rep.status(201).send(await service.createProposal(req.userId, data))
  },
  async update(req: FastifyRequest, rep: FastifyReply) {
    const { id } = idParamSchema.parse(req.params)
    const data = updateWorkanaSchema.parse(req.body)
    return rep.send(await service.updateProposal(req.userId, id, data))
  },
  async delete(req: FastifyRequest, rep: FastifyReply) {
    const { id } = idParamSchema.parse(req.params)
    await service.deleteProposal(req.userId, id)
    return rep.status(204).send()
  },
  async weekCount(req: FastifyRequest, rep: FastifyReply) {
    return rep.send({ count: await service.getWeekCount(req.userId) })
  },
}
