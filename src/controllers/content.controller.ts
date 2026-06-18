import { FastifyRequest, FastifyReply } from 'fastify'
import { ContentService } from '../services/content.service'
import { idParamSchema } from '../validators/common.validator'
import { createContentSchema, updateContentSchema, contentQuerySchema } from '../validators/content.validator'

const service = new ContentService()

export const contentController = {
  async getAll(req: FastifyRequest, rep: FastifyReply) {
    const { platform } = contentQuerySchema.parse(req.query)
    return rep.send(await service.getContent(req.userId, platform))
  },
  async getOne(req: FastifyRequest, rep: FastifyReply) {
    const { id } = idParamSchema.parse(req.params)
    return rep.send(await service.getItem(req.userId, id))
  },
  async create(req: FastifyRequest, rep: FastifyReply) {
    const data = createContentSchema.parse(req.body)
    return rep.status(201).send(await service.createContent(req.userId, data))
  },
  async update(req: FastifyRequest, rep: FastifyReply) {
    const { id } = idParamSchema.parse(req.params)
    const data = updateContentSchema.parse(req.body)
    return rep.send(await service.updateContent(req.userId, id, data))
  },
  async delete(req: FastifyRequest, rep: FastifyReply) {
    const { id } = idParamSchema.parse(req.params)
    await service.deleteContent(req.userId, id)
    return rep.status(204).send()
  },
}
