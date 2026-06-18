import { FastifyRequest, FastifyReply } from 'fastify'

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
    const payload = request.user as { sub: string }
    request.userId = payload.sub
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized', message: 'Token inválido ou expirado' })
  }
}
