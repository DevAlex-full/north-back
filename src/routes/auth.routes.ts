import { FastifyInstance } from 'fastify'
import { authController } from '../controllers/auth.controller'
import { authenticate } from '../middlewares/auth'

export async function authRoutes(fastify: FastifyInstance) {
  const controller = authController(fastify)

  fastify.post('/auth/register', controller.register.bind(controller))
  fastify.post('/auth/login', controller.login.bind(controller))
  fastify.post('/auth/refresh', controller.refresh.bind(controller))
  fastify.post('/auth/logout', { preHandler: [authenticate] }, controller.logout.bind(controller))
  fastify.get('/auth/me', { preHandler: [authenticate] }, controller.me.bind(controller))
  fastify.put('/auth/profile', { preHandler: [authenticate] }, controller.updateProfile.bind(controller))
  fastify.put('/auth/settings', { preHandler: [authenticate] }, controller.updateSettings.bind(controller))
  fastify.put('/auth/notifications', { preHandler: [authenticate] }, controller.updateNotifications.bind(controller))
}
