import { FastifyInstance } from 'fastify'
import { projectController } from '../controllers/project.controller'
import { authenticate } from '../middlewares/auth'

export async function projectRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate)
  fastify.get('/projects', projectController.getAll)
  fastify.get('/projects/:id', projectController.getOne)
  fastify.post('/projects', projectController.create)
  fastify.put('/projects/:id', projectController.update)
  fastify.delete('/projects/:id', projectController.delete)
  fastify.post('/projects/:id/tasks', projectController.createTask)
  fastify.put('/projects/:id/tasks/:taskId', projectController.updateTask)
  fastify.delete('/projects/:id/tasks/:taskId', projectController.deleteTask)
}
