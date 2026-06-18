import { FastifyInstance } from 'fastify'
import { goalController } from '../controllers/goal.controller'
import { authenticate } from '../middlewares/auth'

export async function goalRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate)
  fastify.get('/goals', goalController.getAll)
  fastify.get('/goals/:id', goalController.getOne)
  fastify.post('/goals', goalController.create)
  fastify.put('/goals/:id', goalController.update)
  fastify.delete('/goals/:id', goalController.delete)
}
