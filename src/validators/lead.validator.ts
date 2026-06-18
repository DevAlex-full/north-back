import { z } from 'zod'

export const leadStatusEnum = z.enum([
  'NEW',
  'CONTACTED',
  'REPLIED',
  'PROPOSAL_SENT',
  'NEGOTIATION',
  'CLOSED',
  'LOST',
])

export const createLeadSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  company: z.string().max(200).optional(),
  niche: z.string().max(200).optional(),
  phone: z.string().max(30).optional(),
  instagram: z.string().max(100).optional(),
  origin: z.string().max(50).optional(),
  serviceInterest: z.string().max(200).optional(),
  estimatedValue: z.number().nonnegative().optional(),
  status: leadStatusEnum.optional().default('NEW'),
  nextAction: z.string().max(500).optional(),
  observations: z.string().max(2000).optional(),
  lastContactAt: z.string().optional(),
  followUpAt: z.string().optional(),
})

export const updateLeadSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  company: z.string().max(200).optional(),
  niche: z.string().max(200).optional(),
  phone: z.string().max(30).optional(),
  instagram: z.string().max(100).optional(),
  origin: z.string().max(50).optional(),
  serviceInterest: z.string().max(200).optional(),
  estimatedValue: z.number().nonnegative().optional(),
  status: leadStatusEnum.optional(),
  nextAction: z.string().max(500).optional(),
  observations: z.string().max(2000).optional(),
  lastContactAt: z.string().optional(),
  followUpAt: z.string().optional(),
})

export const leadQuerySchema = z.object({
  status: leadStatusEnum.optional(),
})
