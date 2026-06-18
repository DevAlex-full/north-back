import { ContentRepository } from '../repositories/content.repository'
const repo = new ContentRepository()

export class ContentService {
  async getContent(userId: string, platform?: string) { return repo.findMany(userId, platform) }

  async getItem(userId: string, id: string) {
    const c = await repo.findById(id, userId)
    if (!c) throw { statusCode: 404, message: 'Conteúdo não encontrado' }
    return c
  }

  async createContent(userId: string, data: any) {
    return repo.create({ ...data, userId, scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined })
  }

  async updateContent(userId: string, id: string, data: any) {
    await this.getItem(userId, id)
    return repo.update(id, { ...data, scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined, publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined })
  }

  async deleteContent(userId: string, id: string) {
    await this.getItem(userId, id)
    return repo.delete(id)
  }
}
