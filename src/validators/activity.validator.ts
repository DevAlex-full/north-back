import { z } from 'zod'

export const activityTypeEnum = z.enum([
  'CONTACT_MADE',
  'REPLY_RECEIVED',
  'PROPOSAL_SENT',
  'NEGOTIATION_STARTED',
  'DEAL_CLOSED',
  'PROJECT_STARTED',
  'PAYMENT_RECEIVED',
  'DELIVERY_MADE',
  'SUPPORT_STARTED',
  'NOTE',
])

export const activitySourceEnum = z.enum(['MANUAL', 'AUTO'])

export const createActivitySchema = z.object({
  leadId:      z.string().min(1).optional(),
  projectId:   z.string().min(1).optional(),
  type:        activityTypeEnum,
  title:       z.string().min(1, 'Título é obrigatório').max(300),
  description: z.string().max(2000).optional(),
  source:      activitySourceEnum.optional().default('MANUAL'),
  metadata:    z.record(z.unknown()).optional(),
  occurredAt:  z.string().optional(),
})

export const updateActivitySchema = z.object({
  title:       z.string().min(1).max(300).optional(),
  description: z.string().max(2000).optional(),
  metadata:    z.record(z.unknown()).optional(),
  occurredAt:  z.string().optional(),
})

export const activityQuerySchema = z.object({
  leadId:    z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
})