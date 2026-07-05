import { FastifyRequest, FastifyReply } from 'fastify'
import { LeadService } from '../services/lead.service'
import { idParamSchema } from '../validators/common.validator'
import { createLeadSchema, updateLeadSchema, leadQuerySchema } from '../validators/lead.validator'
import { z } from 'zod'

const service = new LeadService()

const followUpQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(7),
})

export const leadController = {
  async getAll(req: FastifyRequest, rep: FastifyReply) {
    const { status } = leadQuerySchema.parse(req.query)
    return rep.send(await service.getLeads(req.userId, status))
  },
  async getOne(req: FastifyRequest, rep: FastifyReply) {
    const { id } = idParamSchema.parse(req.params)
    return rep.send(await service.getLead(req.userId, id))
  },
  async create(req: FastifyRequest, rep: FastifyReply) {
    const data = createLeadSchema.parse(req.body)
    return rep.status(201).send(await service.createLead(req.userId, data))
  },
  async update(req: FastifyRequest, rep: FastifyReply) {
    const { id } = idParamSchema.parse(req.params)
    const data = updateLeadSchema.parse(req.body)
    return rep.send(await service.updateLead(req.userId, id, data))
  },
  async delete(req: FastifyRequest, rep: FastifyReply) {
    const { id } = idParamSchema.parse(req.params)
    await service.deleteLead(req.userId, id)
    return rep.status(204).send()
  },
  // Fase 4.3 — Follow-ups
  async getFollowUps(req: FastifyRequest, rep: FastifyReply) {
    const { days } = followUpQuerySchema.parse(req.query)
    return rep.send(await service.getFollowUps(req.userId, days))
  },
}