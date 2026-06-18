import { prisma } from '../lib/prisma'

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id }, include: { settings: true } })
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } })
  }

  async create(data: any) {
    return prisma.user.create({ data, include: { settings: true } })
  }

  async update(id: string, data: any) {
    return prisma.user.update({ where: { id }, data, include: { settings: true } })
  }

  async upsertSettings(userId: string, data: any) {
    return prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    })
  }

  async saveRefreshToken(token: string, userId: string, expiresAt: Date) {
    return prisma.refreshToken.create({ data: { token, userId, expiresAt } })
  }

  async findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({ where: { token } })
  }

  async deleteRefreshToken(token: string) {
    return prisma.refreshToken.delete({ where: { token } })
  }

  async deleteAllUserTokens(userId: string) {
    return prisma.refreshToken.deleteMany({ where: { userId } })
  }
}
