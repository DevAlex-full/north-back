import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('*'),
  /**
   * Fase 5.4 — Integração North SDR → North App. Opcionais (não
   * `z.string()` puro) de propósito: se ficarem ausentes no Render, o
   * processo continua subindo normalmente — só a rota de integração
   * responde 503 (ver `middlewares/apiKeyAuth.ts`) até serem configuradas,
   * em vez de derrubar o boot inteiro do North App.
   */
  NORTH_SDR_WEBHOOK_API_KEY: z.string().optional(),
  NORTH_SDR_TARGET_USER_ID: z.string().optional(),
})

export const env = envSchema.parse(process.env)