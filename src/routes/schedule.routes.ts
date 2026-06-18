import { FastifyInstance } from 'fastify'
import { scheduleController } from '../controllers/schedule.controller'
import { authenticate } from '../middlewares/auth'

export async function scheduleRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate)
  fastify.get('/schedule', scheduleController.getAll)
  fastify.get('/schedule/:id', scheduleController.getOne)
  fastify.post('/schedule', scheduleController.create)
  fastify.put('/schedule/:id', scheduleController.update)
  fastify.delete('/schedule/:id', scheduleController.delete)
}
