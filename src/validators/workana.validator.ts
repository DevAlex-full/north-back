import { z } from 'zod'

export const workanaStatusEnum = z.enum([
  'FOUND',
  'SENT',
  'VIEWED',
  'REPLIED',
  'CLOSED',
  'LOST',
])

export const createWorkanaSchema = z.object({
  projectName: z.string().min(1, 'Nome do projeto é obrigatório').max(200),
  client: z.string().max(200).optional(),
  proposedValue: z.number().nonnegative().optional(),
  sentAt: z.string().optional(),
  status: workanaStatusEnum.optional().default('FOUND'),
  projectLink: z.string().max(500).optional(),
  observations: z.string().max(2000).optional(),
})

export const updateWorkanaSchema = z.object({
  projectName: z.string().min(1).max(200).optional(),
  client: z.string().max(200).optional(),
  proposedValue: z.number().nonnegative().optional(),
  sentAt: z.string().optional(),
  status: workanaStatusEnum.optional(),
  projectLink: z.string().max(500).optional(),
  observations: z.string().max(2000).optional(),
})
