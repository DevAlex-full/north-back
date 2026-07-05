import { FastifyInstance } from 'fastify'
import { activityController } from '../controllers/activity.controller'
import { authenticate } from '../middlewares/auth'

export async function activityRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate)
  fastify.get('/activities', activityController.getAll)
  fastify.post('/activities', activityController.create)
  fastify.put('/activities/:id', activityController.update)
  fastify.delete('/activities/:id', activityController.delete)
}