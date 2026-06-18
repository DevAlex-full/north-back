import { TaskRepository } from '../repositories/task.repository'
import { ScheduleRepository } from '../repositories/schedule.repository'
import { CreateTaskInput, UpdateTaskInput } from '../validators/task.validator'

const repo = new TaskRepository()
const scheduleRepo = new ScheduleRepository()

export class TaskService {
  /**
   * Garante que as tarefas do dia existam, gerando-as a partir dos
   * ScheduleBlocks (rotina semanal) cadastrados para o dia da semana
   * correspondente à data informada. Não duplica: cada bloco só gera
   * uma tarefa por data (controlado via scheduleBlockId).
   */
  async ensureTasksForDate(userId: string, date: Date) {
    const day = new Date(date)
    day.setHours(0, 0, 0, 0)
    const dayOfWeek = day.getDay()

    const blocks = await scheduleRepo.findBlocks(userId, dayOfWeek)
    if (blocks.length === 0) return

    const existing = await repo.findMany(userId, { date: day })
    const existingBlockIds = new Set(
      existing.filter((t) => t.scheduleBlockId).map((t) => t.scheduleBlockId as string)
    )

    const toCreate = blocks.filter((b) => !existingBlockIds.has(b.id))

    for (const block of toCreate) {
      await repo.create({
        userId,
        scheduleBlockId: block.id,
        title: block.title,
        description: block.description || undefined,
        date: day,
        status: 'PENDING',
        priority: 2,
        isRecurring: true,
      })
    }
  }

  async getTasks(userId: string, date?: string, status?: string) {
    if (date) {
      await this.ensureTasksForDate(userId, new Date(date))
    }
    const filters: { date?: Date; status?: string } = {}
    if (date) filters.date = new Date(date)
    if (status) filters.status = status
    return repo.findMany(userId, filters)
  }

  async getTask(userId: string, id: string) {
    const task = await repo.findById(id, userId)
    if (!task) throw { statusCode: 404, message: 'Tarefa não encontrada' }
    return task
  }

  async createTask(userId: string, data: CreateTaskInput) {
    return repo.create({ ...data, userId, date: new Date(data.date) })
  }

  async updateTask(userId: string, id: string, data: UpdateTaskInput) {
    await this.getTask(userId, id)
    const payload: Record<string, unknown> = { ...data }
    if (data.date) payload.date = new Date(data.date)
    if (data.completedAt) payload.completedAt = new Date(data.completedAt)
    if (data.status === 'DONE' && !data.completedAt) payload.completedAt = new Date()
    return repo.update(id, userId, payload)
  }

  async deleteTask(userId: string, id: string) {
    await this.getTask(userId, id)
    return repo.delete(id, userId)
  }

  async getDayProgress(userId: string, date: string) {
    await this.ensureTasksForDate(userId, new Date(date))
    return repo.countByDate(userId, new Date(date))
  }
}
