import { ProjectRepository } from '../repositories/project.repository'
import { LeadRepository } from '../repositories/lead.repository'

const repo = new ProjectRepository()
const leadRepo = new LeadRepository()

export class ProjectService {
  async getProjects(userId: string, kind?: string) { return repo.findMany(userId, kind) }

  async getProject(userId: string, id: string) {
    const p = await repo.findById(id, userId)
    if (!p) throw { statusCode: 404, message: 'Projeto não encontrado' }
    return p
  }

  /**
   * Garante que, se um clientId for informado, ele corresponda a um Lead
   * existente e pertencente ao próprio usuário — evita vincular um projeto
   * a um cliente de outra conta.
   */
  private async assertClientOwnership(userId: string, clientId?: string | null) {
    if (!clientId) return
    const lead = await leadRepo.findById(clientId, userId)
    if (!lead) throw { statusCode: 404, message: 'Cliente (lead) não encontrado' }
  }

  async createProject(userId: string, data: any) {
    await this.assertClientOwnership(userId, data.clientId)
    return repo.create({ ...data, userId, deadline: data.deadline ? new Date(data.deadline) : undefined })
  }

  async updateProject(userId: string, id: string, data: any) {
    await this.getProject(userId, id)
    if (data.clientId !== undefined) await this.assertClientOwnership(userId, data.clientId)
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

  /**
   * Resumo financeiro de um projeto: valor combinado, recebido (soma de
   * transações INCOME vinculadas), gasto (soma de EXPENSE vinculadas),
   * pendente (combinado - recebido, nunca negativo) e lucro. Nada aqui é
   * persistido — é sempre calculado a partir do ledger em
   * FinancialTransaction, para nunca ficar inconsistente com os
   * lançamentos reais.
   */
  async getProjectFinance(userId: string, id: string) {
    const project = await this.getProject(userId, id)

    const [received, spent] = await Promise.all([
      repo.sumTransactionsByProject(id, 'INCOME'),
      repo.sumTransactionsByProject(id, 'EXPENSE'),
    ])

    const agreedValue = Number((project as any).agreedValue ?? 0)
    const pending = Math.max(0, agreedValue - received)

    return {
      agreedValue,
      received,
      pending,
      spent,
      profit: received - spent,
    }
  }
}