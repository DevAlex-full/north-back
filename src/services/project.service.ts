import { ProjectRepository } from '../repositories/project.repository'
const repo = new ProjectRepository()

export class ProjectService {
  async getProjects(userId: string) { return repo.findMany(userId) }

  async getProject(userId: string, id: string) {
    const p = await repo.findById(id, userId)
    if (!p) throw { statusCode: 404, message: 'Projeto não encontrado' }
    return p
  }

  async createProject(userId: string, data: any) {
    return repo.create({ ...data, userId, deadline: data.deadline ? new Date(data.deadline) : undefined })
  }

  async updateProject(userId: string, id: string, data: any) {
    await this.getProject(userId, id)
    return repo.update(id, { ...data, deadline: data.deadline ? new Date(data.deadline) : undefined })
  }

  async deleteProject(userId: string, id: string) {
    await this.getProject(userId, id)
    return repo.delete(id)
  }

  async createTask(userId: string, projectId: string, data: any) {
    await this.getProject(userId, projectId)
    return repo.createTask({ ...data, projectId, dueDate: data.dueDate ? new Date(data.dueDate) : undefined })
  }

  async updateTask(userId: string, id: string, data: any) {
    if (data.status === 'DONE') data.completedAt = new Date()
    return repo.updateTask(id, data)
  }

  async deleteTask(userId: string, id: string) { return repo.deleteTask(id) }
}
