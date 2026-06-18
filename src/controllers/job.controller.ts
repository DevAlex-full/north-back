import { FastifyRequest, FastifyReply } from 'fastify'
import { JobService } from '../services/job.service'
import { idParamSchema } from '../validators/common.validator'
import { createJobSchema, updateJobSchema } from '../validators/job.validator'

const service = new JobService()

export const jobController = {
  async getAll(req: FastifyRequest, rep: FastifyReply) {
    return rep.send(await service.getJobs(req.userId))
  },
  async getOne(req: FastifyRequest, rep: FastifyReply) {
    const { id } = idParamSchema.parse(req.params)
    return rep.send(await service.getJob(req.userId, id))
  },
  async create(req: FastifyRequest, rep: FastifyReply) {
    const data = createJobSchema.parse(req.body)
    return rep.status(201).send(await service.createJob(req.userId, data))
  },
  async update(req: FastifyRequest, rep: FastifyReply) {
    const { id } = idParamSchema.parse(req.params)
    const data = updateJobSchema.parse(req.body)
    return rep.send(await service.updateJob(req.userId, id, data))
  },
  async delete(req: FastifyRequest, rep: FastifyReply) {
    const { id } = idParamSchema.parse(req.params)
    await service.deleteJob(req.userId, id)
    return rep.status(204).send()
  },
}
