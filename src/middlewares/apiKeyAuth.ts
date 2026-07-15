import { FastifyRequest, FastifyReply } from 'fastify'
import { env } from '../config/env'

/**
 * Fase 5.4 — Autenticação por API Key para integrações máquina-a-máquina
 * (hoje: North SDR via n8n). Não usa JWT nem o fluxo de login comum dos
 * usuários — mesma ideia já validada em produção no north-SDR-Back
 * (header `x-api-key` + segredo em variável de ambiente própria),
 * aplicada apenas nas rotas de integração via `preHandler`, nunca nas
 * rotas normais do app (que continuam 100% em `authenticate`/JWT).
 *
 * Nunca loga o valor da chave recebida, só o resultado (válida/inválida).
 */
export async function apiKeyAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!env.NORTH_SDR_WEBHOOK_API_KEY) {
    reply.status(503).send({
      error: 'Service Unavailable',
      message: 'Integração North SDR não configurada (NORTH_SDR_WEBHOOK_API_KEY ausente).',
    })
    return
  }

  const apiKey = request.headers['x-api-key']
  if (!apiKey || apiKey !== env.NORTH_SDR_WEBHOOK_API_KEY) {
    reply.status(401).send({ error: 'Unauthorized', message: 'Chave de API inválida ou ausente' })
    return
  }
}