import { FastifyInstance } from 'fastify'
import { workanaController } from '../controllers/workana.controller'
import { authenticate } from '../middlewares/auth'

export async function workanaRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate)
  fastify.get('/workana', workanaController.getAll)
  fastify.get('/workana/week-count', workanaController.weekCount)
  fastify.get('/workana/:id', workanaController.getOne)
  fastify.post('/workana', workanaController.create)
  fastify.put('/workana/:id', workanaController.update)
  fastify.delete('/workana/:id', workanaController.delete)
}
