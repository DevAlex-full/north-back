import { FastifyInstance } from 'fastify'
import { jobController } from '../controllers/job.controller'
import { authenticate } from '../middlewares/auth'

export async function jobRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate)
  fastify.get('/jobs', jobController.getAll)
  fastify.get('/jobs/:id', jobController.getOne)
  fastify.post('/jobs', jobController.create)
  fastify.put('/jobs/:id', jobController.update)
  fastify.delete('/jobs/:id', jobController.delete)
}
