import { FastifyInstance } from 'fastify'
import { taskController } from '../controllers/task.controller'
import { authenticate } from '../middlewares/auth'

export async function taskRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate)
  fastify.get('/tasks', taskController.getAll)
  fastify.get('/tasks/progress', taskController.getDayProgress)
  fastify.get('/tasks/:id', taskController.getOne)
  fastify.post('/tasks', taskController.create)
  fastify.put('/tasks/:id', taskController.update)
  fastify.delete('/tasks/:id', taskController.delete)
}
