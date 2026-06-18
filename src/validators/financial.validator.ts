import { z } from 'zod'

export const financialTypeEnum = z.enum(['INCOME', 'EXPENSE'])

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  type: financialTypeEnum,
  color: z.string().max(20).optional(),
  icon: z.string().max(50).optional(),
})

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: financialTypeEnum.optional(),
  color: z.string().max(20).optional(),
  icon: z.string().max(50).optional(),
})

export const createTransactionSchema = z.object({
  type: financialTypeEnum,
  categoryId: z.string().min(1, 'Categoria é obrigatória'),
  amount: z.number().positive('Valor deve ser maior que zero'),
  description: z.string().max(500).optional(),
  date: z.string().optional(),
  paymentMethod: z.string().max(50).optional(),
  source: z.string().max(50).optional(),
})

export const updateTransactionSchema = z.object({
  type: financialTypeEnum.optional(),
  categoryId: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  description: z.string().max(500).optional(),
  date: z.string().optional(),
  paymentMethod: z.string().max(50).optional(),
  source: z.string().max(50).optional(),
})

export const transactionsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  type: financialTypeEnum.optional(),
})

export const summaryQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month']).optional().default('day'),
})

export const suggestionQuerySchema = z.object({
  amount: z.coerce.number().positive('Valor deve ser maior que zero'),
})

export const dailyGoalQuerySchema = z.object({
  date: z.string().optional(),
})

export const updateDailyGoalSchema = z.object({
  earnedAmount: z.number().min(0).optional(),
  gasAmount: z.number().min(0).optional(),
  targetAmount: z.number().positive().optional(),
})

export const dailyGoalHistoryQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})
