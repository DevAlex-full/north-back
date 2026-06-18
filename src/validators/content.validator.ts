import { z } from 'zod'

export const contentPlatformEnum = z.enum(['instagram', 'linkedin'])
export const contentStatusEnum = z.enum(['IDEA', 'CREATING', 'PUBLISHED', 'REUSE'])

export const createContentSchema = z.object({
  platform: contentPlatformEnum,
  theme: z.string().min(1, 'Tema é obrigatório').max(300),
  status: contentStatusEnum.optional().default('IDEA'),
  scheduledFor: z.string().optional(),
  publishedAt: z.string().optional(),
  observations: z.string().max(2000).optional(),
})

export const updateContentSchema = z.object({
  platform: contentPlatformEnum.optional(),
  theme: z.string().min(1).max(300).optional(),
  status: contentStatusEnum.optional(),
  scheduledFor: z.string().optional(),
  publishedAt: z.string().optional(),
  observations: z.string().max(2000).optional(),
})

export const contentQuerySchema = z.object({
  platform: contentPlatformEnum.optional(),
})
