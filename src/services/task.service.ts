import { TaskRepository } from '../repositories/task.repository'
import { ScheduleRepository } from '../repositories/schedule.repository'
import { CreateTaskInput, UpdateTaskInput } from '../validators/task.validator'
import { getDayOfWeekSP, parseDateOnlySP } from '../utils/date-sp'

const repo = new TaskRepository()
const scheduleRepo = new ScheduleRepository()

export class TaskService {
  /**
   * Garante que as tarefas do dia existam, gerando-as a partir dos
   * ScheduleBlocks (rotina semanal) cadastrados para o dia da semana
   * correspondente à data informada. Não duplica: cada bloco só gera
   * uma tarefa por data (controlado via scheduleBlockId).
   *
   * Correção funcional — `dateStr` é sempre uma data civil "YYYY-MM-DD"
   * em America/Sao_Paulo (nunca um `Date` já resolvido no fuso do
   * servidor); tanto o dia da semana quanto a busca por tarefas já
   * existentes usam a mesma data civil, para nunca duplicar nem "pular"
   * o dia por causa de fuso horário.
   */
  async ensureTasksForDate(userId: string, dateStr: string) {
    const dayOfWeek = getDayOfWeekSP(dateStr)

    const blocks = await scheduleRepo.findBlocks(userId, dayOfWeek)
    if (blocks.length === 0) return

    const existing = await repo.findMany(userId, { date: dateStr })
    const existingBlockIds = new Set(
      existing.filter((t) => t.scheduleBlockId).map((t) => t.scheduleBlockId as string)
    )

    const toCreate = blocks.filter((b) => !existingBlockIds.has(b.id))
    if (toCreate.length === 0) return

    const day = parseDateOnlySP(dateStr)
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
      await this.ensureTasksForDate(userId, date)
    }
    const filters: { date?: string; status?: string } = {}
    if (date) filters.date = date
    if (status) filters.status = status
    return repo.findMany(userId, filters)
  }

  async getTask(userId: string, id: string) {
    const task = await repo.findById(id, userId)
    if (!task) throw { statusCode: 404, message: 'Tarefa não encontrada' }
    return task
  }

  async createTask(userId: string, data: CreateTaskInput) {
    return repo.create({ ...data, userId, date: parseDateOnlySP(data.date) })
  }

  /**
   * Correção funcional — sincroniza `completedAt` com o `status`
   * explicitamente enviado: DONE preenche (preservando o timestamp já
   * existente, se houver — idempotência), qualquer outro status
   * (PENDING/IN_PROGRESS/SKIPPED) zera `completedAt`. Sem `status` no
   * payload, `completedAt` não é tocado a menos que venha explícito.
   */
  async updateTask(userId: string, id: string, data: UpdateTaskInput) {
    const existing = await this.getTask(userId, id)
    const payload: Record<string, unknown> = { ...data }
    if (data.date) payload.date = parseDateOnlySP(data.date)

    if (data.status !== undefined) {
      if (data.status === 'DONE') {
        payload.completedAt = data.completedAt ? new Date(data.completedAt) : existing.completedAt ?? new Date()
      } else {
        payload.completedAt = null
      }
    } else if (data.completedAt) {
      payload.completedAt = new Date(data.completedAt)
    }

    return repo.update(id, userId, payload)
  }

  async deleteTask(userId: string, id: string) {
    await this.getTask(userId, id)
    return repo.delete(id, userId)
  }

  async getDayProgress(userId: string, date: string) {
    await this.ensureTasksForDate(userId, date)
    return repo.countByDate(userId, date)
  }
}