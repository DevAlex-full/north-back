import { FastifyInstance } from 'fastify'
import { dashboardController } from '../controllers/dashboard.controller'
import { authenticate } from '../middlewares/auth'

export async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate)
  fastify.get('/dashboard', dashboardController.get)
}
