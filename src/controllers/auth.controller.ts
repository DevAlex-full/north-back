import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { AuthService } from '../services/auth.service'
import { z } from 'zod'

const service = new AuthService()

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export function authController(fastify: FastifyInstance) {
  return {
    async register(request: FastifyRequest, reply: FastifyReply) {
      const data = registerSchema.parse(request.body)
      const result = await service.register(fastify, data)
      return reply.status(201).send(result)
    },

    async login(request: FastifyRequest, reply: FastifyReply) {
      const { email, password } = loginSchema.parse(request.body)
      const result = await service.login(fastify, email, password)
      return reply.send(result)
    },

    async refresh(request: FastifyRequest, reply: FastifyReply) {
      const { refreshToken } = request.body as any
      if (!refreshToken) return reply.status(400).send({ message: 'Refresh token obrigatório' })
      const result = await service.refresh(fastify, refreshToken)
      return reply.send(result)
    },

    async logout(request: FastifyRequest, reply: FastifyReply) {
      await service.logout(request.userId)
      return reply.send({ message: 'Logout realizado com sucesso' })
    },

    async me(request: FastifyRequest, reply: FastifyReply) {
      const { prisma: db } = await import('../lib/prisma')
      const user = await db.user.findUnique({
        where: { id: request.userId },
        select: { id: true, name: true, email: true, createdAt: true, settings: true, notificationSettings: true }
      })
      if (!user) return reply.status(404).send({ message: 'Usuário não encontrado' })
      return reply.send(user)
    },

    async updateProfile(request: FastifyRequest, reply: FastifyReply) {
      const { prisma: db } = await import('../lib/prisma')
      const data = request.body as any
      const user = await db.user.update({
        where: { id: request.userId },
        data: { name: data.name },
        select: { id: true, name: true, email: true }
      })
      return reply.send(user)
    },

    async updateSettings(request: FastifyRequest, reply: FastifyReply) {
      const { UserRepository } = await import('../repositories/user.repository')
      const repo = new UserRepository()
      const settings = await repo.upsertSettings(request.userId, request.body as any)
      return reply.send(settings)
    },

    async updateNotifications(request: FastifyRequest, reply: FastifyReply) {
      const { prisma: db } = await import('../lib/prisma')
      const settings = await db.notificationSetting.upsert({
        where: { userId: request.userId },
        create: { userId: request.userId, ...(request.body as any) },
        update: request.body as any,
      })
      return reply.send(settings)
    },
  }
}
