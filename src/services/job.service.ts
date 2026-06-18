import { JobRepository } from '../repositories/job.repository'
const repo = new JobRepository()

export class JobService {
  async getJobs(userId: string) { return repo.findMany(userId) }

  async getJob(userId: string, id: string) {
    const j = await repo.findById(id, userId)
    if (!j) throw { statusCode: 404, message: 'Vaga não encontrada' }
    return j
  }

  async createJob(userId: string, data: any) {
    return repo.create({ ...data, userId, appliedAt: data.appliedAt ? new Date(data.appliedAt) : undefined })
  }

  async updateJob(userId: string, id: string, data: any) {
    await this.getJob(userId, id)
    return repo.update(id, { ...data, appliedAt: data.appliedAt ? new Date(data.appliedAt) : undefined })
  }

  async deleteJob(userId: string, id: string) {
    await this.getJob(userId, id)
    return repo.delete(id)
  }
}
