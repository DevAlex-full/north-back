import { FastifyInstance } from 'fastify'
import { leadController } from '../controllers/lead.controller'
import { authenticate } from '../middlewares/auth'

export async function leadRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate)
  fastify.get('/leads', leadController.getAll)
  fastify.get('/leads/:id', leadController.getOne)
  fastify.post('/leads', leadController.create)
  fastify.put('/leads/:id', leadController.update)
  fastify.delete('/leads/:id', leadController.delete)
}
