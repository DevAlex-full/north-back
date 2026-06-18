import { z } from 'zod'

export const idParamSchema = z.object({
  id: z.string().min(1, 'id é obrigatório'),
})

export const projectIdParamSchema = z.object({
  id: z.string().min(1, 'id do projeto é obrigatório'),
})

export const projectTaskParamSchema = z.object({
  id: z.string().min(1, 'id do projeto é obrigatório'),
  taskId: z.string().min(1, 'id da tarefa é obrigatório'),
})

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(50),
})
