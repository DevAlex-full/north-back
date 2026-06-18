import { FastifyError, FastifyRequest, FastifyReply } from 'fastify'
import { ZodError } from 'zod'

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: 'Dados inválidos',
      details: error.errors,
    })
  }

  if (error.statusCode) {
    return reply.status(error.statusCode).send({
      error: error.name,
      message: error.message,
    })
  }

  console.error(error)
  return reply.status(500).send({
    error: 'Internal Server Error',
    message: 'Erro interno do servidor',
  })
}
