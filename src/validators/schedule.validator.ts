import { z } from 'zod'

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/

export const createScheduleBlockSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200),
  description: z.string().max(2000).optional(),
  startTime: z.string().regex(timeRegex, 'Formato esperado HH:MM'),
  endTime: z.string().regex(timeRegex, 'Formato esperado HH:MM'),
  dayOfWeek: z.array(z.number().int().min(0).max(6)).min(1, 'Selecione ao menos um dia'),
  category: z.string().max(50).optional(),
  isRecurring: z.boolean().optional().default(true),
  isActive: z.boolean().optional().default(true),
  routineId: z.string().optional(),
})

export const updateScheduleBlockSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  startTime: z.string().regex(timeRegex, 'Formato esperado HH:MM').optional(),
  endTime: z.string().regex(timeRegex, 'Formato esperado HH:MM').optional(),
  dayOfWeek: z.array(z.number().int().min(0).max(6)).min(1).optional(),
  category: z.string().max(50).optional(),
  isRecurring: z.boolean().optional(),
  isActive: z.boolean().optional(),
  routineId: z.string().optional(),
})

export const scheduleQuerySchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
})
