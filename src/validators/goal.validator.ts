import { z } from 'zod'

export const goalTypeEnum = z.enum(['COUNTER', 'FINANCIAL', 'BOOLEAN'])
export const goalStatusEnum = z.enum(['ACTIVE', 'COMPLETED', 'PAUSED'])

export const createGoalSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200),
  description: z.string().max(2000).optional(),
  type: goalTypeEnum,
  target: z.number().positive('Meta deve ser maior que zero'),
  current: z.number().nonnegative().optional().default(0),
  unit: z.string().max(20).optional(),
  deadline: z.string().optional(),
  status: goalStatusEnum.optional().default('ACTIVE'),
})

export const updateGoalSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  type: goalTypeEnum.optional(),
  target: z.number().positive().optional(),
  current: z.number().nonnegative().optional(),
  unit: z.string().max(20).optional(),
  deadline: z.string().optional(),
  status: goalStatusEnum.optional(),
})
