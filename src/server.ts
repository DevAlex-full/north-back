import 'dotenv/config'
import { buildApp } from './app'
import { env } from './config/env'

async function main() {
  const app = await buildApp()

  try {
    const port = parseInt(env.PORT, 10)
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`🚀 North API rodando na porta ${port}`)
    console.log(`📖 Health check: http://localhost:${port}/health`)
    console.log(`🌍 Ambiente: ${env.NODE_ENV}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

main()
