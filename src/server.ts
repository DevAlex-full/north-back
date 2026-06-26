import 'dotenv/config'
import { buildApp } from './app'
import { env } from './config/env'

async function main() {
  const app = await buildApp()

  try {
    const port = Number(process.env.PORT) || Number(env.PORT) || 3000

    await app.listen({ port, host: '0.0.0.0' })

    console.log(`🚀 North API rodando na porta ${port}`)
    console.log(`📖 Health check: http://0.0.0.0:${port}/health`)
    console.log(`🌍 Ambiente: ${env.NODE_ENV}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

main()