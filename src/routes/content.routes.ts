import { FastifyInstance } from 'fastify'
import { contentController } from '../controllers/content.controller'
import { authenticate } from '../middlewares/auth'

export async function contentRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate)
  fastify.get('/content', contentController.getAll)
  fastify.get('/content/:id', contentController.getOne)
  fastify.post('/content', contentController.create)
  fastify.put('/content/:id', contentController.update)
  fastify.delete('/content/:id', contentController.delete)
}
