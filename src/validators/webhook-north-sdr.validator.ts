import { z } from 'zod'

/**
 * Fase 5.4 — Contrato de entrada do webhook North SDR → North App.
 * Nomes de campo alinhados com o que o Formatter do n8n já produz hoje
 * (confirmado em `webhooks.schema.ts` do north-SDR-Back), mais os campos
 * de contato que o CRM do North App precisa (`contactName`, `phone`,
 * `whatsapp`, `email`, `serviceInterest`, `estimatedValue`) que o
 * north-SDR-Back não valida hoje, mas o North SDR pode passar a enviar.
 *
 * Só `companyName` é obrigatório — tudo o mais é opcional para não
 * quebrar o formulário caso o n8n ainda não envie algum campo.
 */
export const northSdrLeadWebhookSchema = z.object({
  companyName: z.string().min(1, 'companyName é obrigatório'),
  contactName: z.string().optional(),
  niche: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  instagram: z.string().optional(),
  website: z.string().optional(),
  preferredChannel: z.string().optional(),
  serviceInterest: z.string().optional(),
  estimatedValue: z.number().optional(),
  nextAction: z.string().optional(),

  // Conteúdo rico do diagnóstico — sem campo próprio no Lead, vai para ActivityLog.metadata (ver 5.4B).
  classification: z.string().optional(),
  executiveSummary: z.string().optional(),
  commercialDiagnosis: z.string().optional(),
  pains: z.array(z.string()).optional().default([]),
  opportunities: z.array(z.string()).optional().default([]),
  strategy: z.string().optional(),
  initialMessage: z.string().optional(),
  followUp1: z.string().optional(),
  followUp2: z.string().optional(),
  confirmedInfo: z.array(z.string()).optional().default([]),
  hypotheses: z.array(z.string()).optional().default([]),
  missingInfo: z.array(z.string()).optional().default([]),
  closingProbability: z.number().optional(),
  notes: z.string().optional(),
})

export type NorthSdrLeadWebhookInput = z.infer<typeof northSdrLeadWebhookSchema>