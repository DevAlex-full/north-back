import { z } from 'zod'

export const taskStatusEnum = z.enum(['PENDING', 'IN_PROGRESS', 'DONE', 'SKIPPED'])

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200),
  description: z.string().max(2000).optional(),
  date: z.string().min(1, 'Data é obrigatória'),
  status: taskStatusEnum.optional().default('PENDING'),
  priority: z.number().int().min(1).max(3).optional().default(2),
  isRecurring: z.boolean().optional().default(false),
  scheduleBlockId: z.string().optional(),
  observation: z.string().max(2000).optional(),
})

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  date: z.string().optional(),
  status: taskStatusEnum.optional(),
  priority: z.number().int().min(1).max(3).optional(),
  isRecurring: z.boolean().optional(),
  scheduleBlockId: z.string().optional(),
  observation: z.string().max(2000).optional(),
  completedAt: z.string().optional(),
})

export const taskQuerySchema = z.object({
  date: z.string().optional(),
  status: taskStatusEnum.optional(),
})

export const taskProgressQuerySchema = z.object({
  date: z.string().optional(),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
