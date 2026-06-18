import { z } from 'zod'

export const projectStatusEnum = z.enum(['IDEA', 'IN_PROGRESS', 'PAUSED', 'DONE'])
export const projectTaskStatusEnum = z.enum(['PENDING', 'IN_PROGRESS', 'DONE'])

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  description: z.string().max(2000).optional(),
  status: projectStatusEnum.optional().default('IN_PROGRESS'),
  priority: z.number().int().min(1).max(4).optional().default(2),
  deadline: z.string().optional(),
  observations: z.string().max(2000).optional(),
})

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: projectStatusEnum.optional(),
  priority: z.number().int().min(1).max(4).optional(),
  deadline: z.string().optional(),
  observations: z.string().max(2000).optional(),
})

export const createProjectTaskSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200),
  description: z.string().max(2000).optional(),
  status: projectTaskStatusEnum.optional().default('PENDING'),
  priority: z.number().int().min(1).max(3).optional().default(2),
  dueDate: z.string().optional(),
})

export const updateProjectTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: projectTaskStatusEnum.optional(),
  priority: z.number().int().min(1).max(3).optional(),
  dueDate: z.string().optional(),
})
