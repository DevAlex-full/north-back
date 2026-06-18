import { ScheduleRepository } from '../repositories/schedule.repository'
const repo = new ScheduleRepository()

export class ScheduleService {
  async getBlocks(userId: string, dayOfWeek?: number) { return repo.findBlocks(userId, dayOfWeek) }

  async getBlock(userId: string, id: string) {
    const b = await repo.findBlockById(id, userId)
    if (!b) throw { statusCode: 404, message: 'Bloco não encontrado' }
    return b
  }

  async createBlock(userId: string, data: any) { return repo.createBlock({ ...data, userId }) }

  async updateBlock(userId: string, id: string, data: any) {
    await this.getBlock(userId, id)
    return repo.updateBlock(id, data)
  }

  async deleteBlock(userId: string, id: string) {
    await this.getBlock(userId, id)
    return repo.deleteBlock(id)
  }
}
