import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'

import { env } from '../config/env'
import { errorHandler } from '../middlewares/errorHandler'

import { authRoutes } from '../routes/auth.routes'
import { taskRoutes } from '../routes/task.routes'
import { financialRoutes } from '../routes/financial.routes'
import { leadRoutes } from '../routes/lead.routes'
import { workanaRoutes } from '../routes/workana.routes'
import { projectRoutes } from '../routes/project.routes'
import { goalRoutes } from '../routes/goal.routes'
import { scheduleRoutes } from '../routes/schedule.routes'
import { contentRoutes } from '../routes/content.routes'
import { jobRoutes } from '../routes/job.routes'
import { dashboardRoutes } from '../routes/dashboard.routes'

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'warn' : 'info',
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  })

  // Plugins
  await fastify.register(helmet, { contentSecurityPolicy: false })
  await fastify.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })
  await fastify.register(jwt, {
    secret: env.JWT_SECRET,
  })

  // Error handler
  fastify.setErrorHandler(errorHandler)

  // Health check
  fastify.get('/health', async () => ({
    status: 'ok',
    app: 'North API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  }))

  // Routes
  const prefix = '/api/v1'
  fastify.register(authRoutes, { prefix })
  fastify.register(dashboardRoutes, { prefix })
  fastify.register(taskRoutes, { prefix })
  fastify.register(financialRoutes, { prefix })
  fastify.register(leadRoutes, { prefix })
  fastify.register(workanaRoutes, { prefix })
  fastify.register(projectRoutes, { prefix })
  fastify.register(goalRoutes, { prefix })
  fastify.register(scheduleRoutes, { prefix })
  fastify.register(contentRoutes, { prefix })
  fastify.register(jobRoutes, { prefix })

  return fastify
}
