import { prisma } from '../lib/prisma'
import { TaskRepository } from '../repositories/task.repository'
import { FinancialRepository } from '../repositories/financial.repository'
import { TaskService } from './task.service'
import { FinancialService } from './financial.service'
import { getTodayDateStringSP, getDayRangeSP, getCurrentHourSP } from '../utils/date-sp'

const taskRepo = new TaskRepository()
const finRepo = new FinancialRepository()
const taskService = new TaskService()
const financialService = new FinancialService()

export class DashboardService {
  /**
   * Correção funcional — "hoje" é sempre o dia civil em America/Sao_Paulo
   * (`getTodayDateStringSP`), nunca `new Date()` interpretado no fuso do
   * servidor (Render roda em UTC; à noite no Brasil o servidor já pode
   * estar no dia seguinte). Usa exatamente a mesma data civil que a
   * Agenda usa para "hoje" (`utils/date.ts:getTodayString()` no
   * frontend), garantindo os mesmos IDs e statuses nas duas telas.
   *
   * A Meta Indrive vem de `financialService.reconcileDailyGoalFromTransactions`
   * (fonte única de verdade: FinancialTransaction), nunca de um
   * `DailyGoal` lido cru — evita a divergência entre Dashboard e
   * Financeiro descrita no problema 1.
   */
  async getDashboard(userId: string) {
    const todayStr = getTodayDateStringSP()
    const { start: todayStart, end: todayEnd } = getDayRangeSP(todayStr)

    // Garante que as tarefas de hoje existam (geradas a partir da rotina semanal)
    await taskService.ensureTasksForDate(userId, todayStr)

    const [tasks, todaySummary, dailyGoal, user] = await Promise.all([
      taskRepo.findMany(userId, { date: todayStr }),
      finRepo.getSummary(userId, todayStart, todayEnd),
      financialService.reconcileDailyGoalFromTransactions(userId, todayStr),
      prisma.user.findUnique({ where: { id: userId }, include: { settings: true } }),
    ])

    const { total, done } = await taskRepo.countByDate(userId, todayStr)
    const progress = total > 0 ? Math.round((done / total) * 100) : 0

    const targetAmount = dailyGoal.targetAmount
    const earned = dailyGoal.earnedAmount
    const expenses = dailyGoal.expenseAmount
    const netProfit = earned - expenses
    const remaining = Math.max(0, targetAmount - netProfit)

    // Saudação: hora atual em São Paulo, não a hora local do servidor.
    const hourSP = getCurrentHourSP()
    let greeting = 'Bom dia'
    if (hourSP >= 12 && hourSP < 18) greeting = 'Boa tarde'
    else if (hourSP >= 18) greeting = 'Boa noite'

    return {
      greeting: `${greeting}, ${user?.name ?? 'Alex'}`,
      date: todayStr,
      progress,
      tasks,
      financial: {
        earned,
        expenses,
        gas: expenses, // alias legado temporário — ver dashboard.tsx, remover quando o app publicado consumir `expenses`
        netProfit,
        target: targetAmount,
        remaining,
        ...todaySummary,
        status: dailyGoal.status,
      },
    }
  }
}