import { FastifyInstance } from 'fastify'
import { webhookNorthSdrController } from '../controllers/webhook-north-sdr.controller'
import { apiKeyAuth } from '../middlewares/apiKeyAuth'

/**
 * Fase 5.4 — Rota de integração North SDR → North App. Autenticada por
 * API Key (`apiKeyAuth`), nunca por JWT/login comum. Rate limit próprio
 * (30 req/min), mais permissivo que o global (100 req/min) mas ainda
 * limitado — cobre reprocessamentos manuais do n8n sem abrir espaço para
 * abuso caso a chave vaze.
 */
export async function webhookNorthSdrRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', apiKeyAuth)

  fastify.post(
    '/webhooks/north-sdr/leads',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    webhookNorthSdrController.ingestLead
  )
}