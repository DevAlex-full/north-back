import { FastifyRequest, FastifyReply } from 'fastify'
import { TaskService } from '../services/task.service'
import { idParamSchema } from '../validators/common.validator'
import { createTaskSchema, updateTaskSchema, taskQuerySchema, taskProgressQuerySchema } from '../validators/task.validator'

const service = new TaskService()

export const taskController = {
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    const query = taskQuerySchema.parse(request.query)
    return reply.send(await service.getTasks(request.userId, query.date, query.status))
  },

  async getOne(request: FastifyRequest, reply: FastifyReply) {
    const { id } = idParamSchema.parse(request.params)
    return reply.send(await service.getTask(request.userId, id))
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createTaskSchema.parse(request.body)
    const task = await service.createTask(request.userId, data)
    return reply.status(201).send(task)
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = idParamSchema.parse(request.params)
    const data = updateTaskSchema.parse(request.body)
    return reply.send(await service.updateTask(request.userId, id, data))
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = idParamSchema.parse(request.params)
    await service.deleteTask(request.userId, id)
    return reply.status(204).send()
  },

  async getDayProgress(request: FastifyRequest, reply: FastifyReply) {
    const query = taskProgressQuerySchema.parse(request.query)
    const d = query.date || new Date().toISOString().split('T')[0]
    return reply.send(await service.getDayProgress(request.userId, d))
  },
}
