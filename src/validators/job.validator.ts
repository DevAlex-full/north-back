import { z } from 'zod'

export const jobStatusEnum = z.enum([
  'FOUND',
  'APPLIED',
  'INTERVIEW',
  'TECHNICAL_TEST',
  'APPROVED',
  'REJECTED',
])

export const createJobSchema = z.object({
  company: z.string().min(1, 'Empresa é obrigatória').max(200),
  position: z.string().min(1, 'Cargo é obrigatório').max(200),
  jobLink: z.string().max(500).optional(),
  appliedAt: z.string().optional(),
  status: jobStatusEnum.optional().default('FOUND'),
  observations: z.string().max(2000).optional(),
})

export const updateJobSchema = z.object({
  company: z.string().min(1).max(200).optional(),
  position: z.string().min(1).max(200).optional(),
  jobLink: z.string().max(500).optional(),
  appliedAt: z.string().optional(),
  status: jobStatusEnum.optional(),
  observations: z.string().max(2000).optional(),
})
