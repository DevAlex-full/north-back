import { Prisma } from '@prisma/client'
import { LeadRepository } from '../repositories/lead.repository'
import { ActivityRepository } from '../repositories/activity.repository'
import { env } from '../config/env'
import type { NorthSdrLeadWebhookInput } from '../validators/webhook-north-sdr.validator'

const leadRepo = new LeadRepository()
const activityRepo = new ActivityRepository()

/** Fase 5.4 — origem fixa para leads vindos do North SDR (`Lead.origin` é texto livre, sem enum no schema). */
const NORTH_SDR_ORIGIN = 'north_sdr'

/** Margem de segurança abaixo do limite de 2000 caracteres de `Lead.observations`. */
const OBSERVATIONS_MAX_LENGTH = 1900

export interface NorthSdrWebhookResult {
  created: boolean
  duplicate: boolean
  leadId: string
  message: string
}

/** Formato mínimo de Lead necessário para decidir o que preencher em `buildUpdatePatch` — evita depender do tipo completo gerado pelo Prisma. */
interface ExistingLeadFields {
  niche: string | null
  serviceInterest: string | null
  estimatedValue: number | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  website: string | null
  nextAction: string | null
  observations: string | null
}

export class WebhookNorthSdrService {
  /**
   * Fase 5.4E — Fluxo completo de ingestão de um lead vindo do North SDR:
   * resolve o usuário-alvo (single-user, Opção aprovada), resolve-ou-cria
   * o Lead (idempotência, Opção A), e registra um ActivityLog automático
   * com o diagnóstico completo — sem perda de informação, sem sobrescrever
   * dados manuais existentes.
   */
  async ingestLead(payload: NorthSdrLeadWebhookInput): Promise<NorthSdrWebhookResult> {
    const userId = this.resolveTargetUserId()
    const summary = this.buildObservationsSummary(payload)
    const metadata = this.buildMetadata(payload)

    const existing = await leadRepo.findForIdempotency(userId, {
      instagram: payload.instagram || undefined,
      companyName: payload.companyName,
    })

    const created = !existing
    const leadId = existing
      ? (await leadRepo.update(existing.id, this.buildUpdatePatch(existing, payload, summary))).id
      : (await leadRepo.create(this.buildCreatePayload(userId, payload, summary))).id

    await activityRepo.create({
      userId,
      leadId,
      type: 'NOTE',
      title: created ? 'Lead importado do North SDR' : 'Novo diagnóstico do North SDR recebido',
      description: summary,
      source: 'AUTO',
      metadata,
      occurredAt: new Date(),
    })

    return {
      created,
      duplicate: !created,
      leadId,
      message: created
        ? 'Lead criado com sucesso a partir do North SDR'
        : 'Lead já existia — atualizado com o novo diagnóstico do North SDR',
    }
  }

  /**
   * Fase 5.4 — Ambiente single-user (aprovado): o alvo é sempre o mesmo
   * usuário, configurado uma única vez via env var. Nenhuma lógica
   * multi-tenant nesta fase.
   */
  private resolveTargetUserId(): string {
    if (!env.NORTH_SDR_TARGET_USER_ID) {
      throw { statusCode: 503, message: 'Integração North SDR não configurada (NORTH_SDR_TARGET_USER_ID ausente).' }
    }
    return env.NORTH_SDR_TARGET_USER_ID
  }

  private buildCreatePayload(userId: string, payload: NorthSdrLeadWebhookInput, summary: string) {
    return {
      userId,
      name: payload.contactName || payload.companyName,
      company: payload.companyName,
      niche: payload.niche,
      phone: payload.phone,
      whatsapp: payload.whatsapp,
      email: payload.email || undefined,
      instagram: payload.instagram,
      website: payload.website,
      origin: NORTH_SDR_ORIGIN,
      serviceInterest: payload.serviceInterest,
      estimatedValue: payload.estimatedValue,
      status: 'NEW',
      nextAction: payload.nextAction,
      observations: summary,
    }
  }

  /**
   * Fase 5.4D — Regra de não sobrescrita: só preenche campos que HOJE
   * estão vazios no lead existente. Nunca mexe em `status`, `followUpAt`
   * ou em `observations` já preenchidas — o funil comercial e as notas
   * manuais do usuário são preservados integralmente. O novo diagnóstico
   * completo sempre vai para o ActivityLog, então nada se perde mesmo
   * quando o Lead em si não muda.
   */
  private buildUpdatePatch(existing: ExistingLeadFields, payload: NorthSdrLeadWebhookInput, summary: string) {
    const patch: Record<string, unknown> = {}

    if (!existing.niche && payload.niche) patch.niche = payload.niche
    if (!existing.serviceInterest && payload.serviceInterest) patch.serviceInterest = payload.serviceInterest
    if (existing.estimatedValue == null && payload.estimatedValue != null) patch.estimatedValue = payload.estimatedValue
    if (!existing.phone && payload.phone) patch.phone = payload.phone
    if (!existing.whatsapp && payload.whatsapp) patch.whatsapp = payload.whatsapp
    if (!existing.email && payload.email) patch.email = payload.email
    if (!existing.website && payload.website) patch.website = payload.website
    if (!existing.nextAction && payload.nextAction) patch.nextAction = payload.nextAction
    if (!existing.observations) patch.observations = summary

    return patch
  }

  /** Resumo curto e legível para `Lead.observations` (máx. 2000 caracteres no schema) — o conteúdo completo sempre vai para o ActivityLog.metadata, sem corte. */
  private buildObservationsSummary(payload: NorthSdrLeadWebhookInput): string {
    const parts: string[] = ['Lead importado automaticamente do North SDR.']

    if (payload.classification) parts.push(`Classificação: ${payload.classification}.`)
    if (payload.commercialDiagnosis) parts.push(`Diagnóstico: ${payload.commercialDiagnosis}`)
    else if (payload.executiveSummary) parts.push(`Resumo: ${payload.executiveSummary}`)
    if (payload.pains.length > 0) parts.push(`Principais dores: ${payload.pains.slice(0, 3).join('; ')}.`)

    const full = parts.join(' ')
    return full.length > OBSERVATIONS_MAX_LENGTH ? `${full.slice(0, OBSERVATIONS_MAX_LENGTH - 3)}...` : full
  }

  /** Fase 5.4B — Conteúdo estruturado completo (diagnóstico, dores, mensagens, estratégia), sem perda de informação, em ActivityLog.metadata (Json, sem limite de tamanho). */
  private buildMetadata(payload: NorthSdrLeadWebhookInput): Prisma.InputJsonValue {
    return {
      source: NORTH_SDR_ORIGIN,
      companyName: payload.companyName,
      contactName: payload.contactName ?? null,
      preferredChannel: payload.preferredChannel ?? null,
      classification: payload.classification ?? null,
      executiveSummary: payload.executiveSummary ?? null,
      commercialDiagnosis: payload.commercialDiagnosis ?? null,
      pains: payload.pains,
      opportunities: payload.opportunities,
      strategy: payload.strategy ?? null,
      nextAction: payload.nextAction ?? null,
      initialMessage: payload.initialMessage ?? null,
      followUp1: payload.followUp1 ?? null,
      followUp2: payload.followUp2 ?? null,
      confirmedInfo: payload.confirmedInfo,
      hypotheses: payload.hypotheses,
      missingInfo: payload.missingInfo,
      closingProbability: payload.closingProbability ?? null,
      notes: payload.notes ?? null,
    }
  }
}