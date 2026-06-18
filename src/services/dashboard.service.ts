import { prisma } from '../lib/prisma'
import { TaskRepository } from '../repositories/task.repository'
import { FinancialRepository } from '../repositories/financial.repository'
import { TaskService } from './task.service'

const taskRepo = new TaskRepository()
const finRepo = new FinancialRepository()
const taskService = new TaskService()

export class DashboardService {
  async getDashboard(userId: string) {
    const now = new Date()
    const today = new Date(now); today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)

    // Garante que as tarefas de hoje existam (geradas a partir da rotina semanal)
    await taskService.ensureTasksForDate(userId, now)

    const [tasks, todaySummary, dailyGoal, user] = await Promise.all([
      taskRepo.findMany(userId, { date: now }),
      finRepo.getSummary(userId, today, todayEnd),
      finRepo.findDailyGoal(userId, now),
      prisma.user.findUnique({ where: { id: userId }, include: { settings: true } }),
    ])

    const { total, done } = await taskRepo.countByDate(userId, now)
    const progress = total > 0 ? Math.round((done / total) * 100) : 0

    const targetAmount = dailyGoal?.targetAmount ?? user?.settings?.dailyGoalAmount ?? 150
    const earned = dailyGoal?.earnedAmount ?? 0
    const gas = dailyGoal?.gasAmount ?? 0
    const netProfit = earned - gas
    const remaining = Math.max(0, targetAmount - netProfit)

    const hour = now.getHours()
    let greeting = 'Bom dia'
    if (hour >= 12 && hour < 18) greeting = 'Boa tarde'
    else if (hour >= 18) greeting = 'Boa noite'

    return {
      greeting: `${greeting}, ${user?.name ?? 'Alex'}`,
      date: now.toISOString(),
      progress,
      tasks,
      financial: {
        earned,
        gas,
        netProfit,
        target: targetAmount,
        remaining,
        ...todaySummary,
        status: netProfit >= targetAmount ? 'REACHED' : netProfit >= targetAmount * 0.8 ? 'ALMOST' : 'BELOW',
      },
    }
  }
}
