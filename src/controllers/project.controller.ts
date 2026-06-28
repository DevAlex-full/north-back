import { FastifyRequest, FastifyReply } from 'fastify'
import { ProjectService } from '../services/project.service'
import { idParamSchema, projectTaskParamSchema } from '../validators/common.validator'
import {
  createProjectSchema,
  updateProjectSchema,
  createProjectTaskSchema,
  updateProjectTaskSchema,
  projectQuerySchema,
} from '../validators/project.validator'

const service = new ProjectService()

export const projectController = {
  async getAll(req: FastifyRequest, rep: FastifyReply) {
    const { kind } = projectQuerySchema.parse(req.query)
    return rep.send(await service.getProjects(req.userId, kind))
  },
  async getOne(req: FastifyRequest, rep: FastifyReply) {
    const { id } = idParamSchema.parse(req.params)
    return rep.send(await service.getProject(req.userId, id))
  },
  async create(req: FastifyRequest, rep: FastifyReply) {
    const data = createProjectSchema.parse(req.body)
    return rep.status(201).send(await service.createProject(req.userId, data))
  },
  async update(req: FastifyRequest, rep: FastifyReply) {
    const { id } = idParamSchema.parse(req.params)
    const data = updateProjectSchema.parse(req.body)
    return rep.send(await service.updateProject(req.userId, id, data))
  },
  async delete(req: FastifyRequest, rep: FastifyReply) {
    const { id } = idParamSchema.parse(req.params)
    await service.deleteProject(req.userId, id)
    return rep.status(204).send()
  },
  async createTask(req: FastifyRequest, rep: FastifyReply) {
    const { id } = idParamSchema.parse(req.params)
    const data = createProjectTaskSchema.parse(req.body)
    return rep.status(201).send(await service.createTask(req.userId, id, data))
  },
  async updateTask(req: FastifyRequest, rep: FastifyReply) {
    const { taskId } = projectTaskParamSchema.parse(req.params)
    const data = updateProjectTaskSchema.parse(req.body)
    return rep.send(await service.updateTask(req.userId, taskId, data))
  },
  async deleteTask(req: FastifyRequest, rep: FastifyReply) {
    const { taskId } = projectTaskParamSchema.parse(req.params)
    await service.deleteTask(req.userId, taskId)
    return rep.status(204).send()
  },
  async getFinance(req: FastifyRequest, rep: FastifyReply) {
    const { id } = idParamSchema.parse(req.params)
    return rep.send(await service.getProjectFinance(req.userId, id))
  },
}