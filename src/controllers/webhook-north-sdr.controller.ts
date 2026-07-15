import { FastifyRequest, FastifyReply } from 'fastify'
import { WebhookNorthSdrService } from '../services/webhook-north-sdr.service'
import { northSdrLeadWebhookSchema } from '../validators/webhook-north-sdr.validator'

const service = new WebhookNorthSdrService()

export const webhookNorthSdrController = {
  /**
   * Fase 5.4G — Resposta sempre inclui `created`/`duplicate`/`leadId`/
   * `message`/`timestamp`, para o n8n distinguir sucesso de duplicidade
   * sem ambiguidade. Erros de validação (400), autenticação (401/503) e
   * internos (500) são tratados pelo `errorHandler` global, no mesmo
   * formato já usado por todas as outras rotas do North App.
   */
  async ingestLead(request: FastifyRequest, reply: FastifyReply) {
    const payload = northSdrLeadWebhookSchema.parse(request.body)
    const result = await service.ingestLead(payload)

    return reply.status(result.created ? 201 : 200).send({
      success: true,
      created: result.created,
      duplicate: result.duplicate,
      leadId: result.leadId,
      message: result.message,
      timestamp: new Date().toISOString(),
    })
  },
}