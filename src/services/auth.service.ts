import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { UserRepository } from '../repositories/user.repository'
import { FastifyInstance } from 'fastify'
import { env } from '../config/env'

const userRepo = new UserRepository()

interface RefreshPayload {
  sub: string
  type: 'refresh'
}

export class AuthService {
  async register(fastify: FastifyInstance, data: { name: string; email: string; password: string }) {
    const existing = await userRepo.findByEmail(data.email)
    if (existing) throw { statusCode: 409, message: 'Email já cadastrado' }

    const hashedPassword = await bcrypt.hash(data.password, 10)
    const user = await userRepo.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      settings: { create: {} },
      notificationSettings: { create: {} },
    })

    const { accessToken, refreshToken } = await this.generateTokens(fastify, user.id)
    return { user: { id: user.id, name: user.name, email: user.email }, accessToken, refreshToken }
  }

  async login(fastify: FastifyInstance, email: string, password: string) {
    const user = await userRepo.findByEmail(email)
    if (!user) throw { statusCode: 401, message: 'Credenciais inválidas' }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) throw { statusCode: 401, message: 'Credenciais inválidas' }

    const { accessToken, refreshToken } = await this.generateTokens(fastify, user.id)
    return { user: { id: user.id, name: user.name, email: user.email }, accessToken, refreshToken }
  }

  async refresh(fastify: FastifyInstance, token: string) {
    // 1. Valida assinatura e expiração do refresh token com o secret CORRETO
    let payload: RefreshPayload
    try {
      payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload
    } catch {
      throw { statusCode: 401, message: 'Refresh token inválido ou expirado' }
    }

    // 2. Garante que o token é realmente do tipo "refresh" (não um access token reaproveitado)
    if (payload.type !== 'refresh') {
      throw { statusCode: 401, message: 'Token inválido para esta operação' }
    }

    // 3. Garante que o token está persistido e ainda não expirou no banco
    const stored = await userRepo.findRefreshToken(token)
    if (!stored || stored.expiresAt < new Date()) {
      throw { statusCode: 401, message: 'Refresh token inválido ou expirado' }
    }

    // 4. Revoga o token antigo (rotação de refresh token) e gera um novo par
    await userRepo.deleteRefreshToken(token)
    const { accessToken, refreshToken } = await this.generateTokens(fastify, stored.userId)
    return { accessToken, refreshToken }
  }

  async logout(userId: string) {
    await userRepo.deleteAllUserTokens(userId)
  }

  private async generateTokens(fastify: FastifyInstance, userId: string) {
    // Access token: assinado pelo plugin @fastify/jwt, que usa env.JWT_SECRET
    const accessToken = fastify.jwt.sign({ sub: userId }, { expiresIn: env.JWT_EXPIRES_IN })

    // Refresh token: assinado manualmente com jsonwebtoken usando env.JWT_REFRESH_SECRET
    const refreshToken = jwt.sign(
      { sub: userId, type: 'refresh' } as RefreshPayload,
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
    )

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)
    await userRepo.saveRefreshToken(refreshToken, userId, expiresAt)

    return { accessToken, refreshToken }
  }
}
