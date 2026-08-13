import { FinancialRepository } from '../repositories/financial.repository'
import { ProjectRepository } from '../repositories/project.repository'
import { ActivityRepository } from '../repositories/activity.repository'
import { formatDateStringSP, getDayRangeSP, getTodayDateStringSP } from '../utils/date-sp'

const repo = new FinancialRepository()
const projectRepo = new ProjectRepository()
const activityRepo = new ActivityRepository()

/** Arredonda para 2 casas decimais, evitando resíduos de ponto flutuante (ex: 0.1 + 0.2). */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Normaliza um texto para comparação: remove acentuação (NFD + strip de
 * marcas diacríticas), corta espaços nas pontas e converte para
 * minúsculas — "Combustível", " combustivel ", "COMBUSTÍVEL" e
 * "combustível" resultam todos em "combustivel".
 */
function normalize(s?: string | null): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

/** Nomes de categoria (já normalizados) reconhecidos como Gasolina/Combustível. */
const GAS_CATEGORY_NAMES = new Set(['gasolina', 'combustivel'])

type ClassifiableTransaction = { type: string; source?: string | null; category?: { name: string } | null }

/** Uma transação conta como ganho Indrive quando é INCOME e a origem OU a categoria (normalizadas) forem "indrive". */
function isIndriveIncomeTx(t: ClassifiableTransaction): boolean {
  if (t.type !== 'INCOME') return false
  return normalize(t.source) === 'indrive' || normalize(t.category?.name) === 'indrive'
}

/**
 * Correção Meta Indrive — Uma transação conta como despesa operacional do
 * Indrive quando `type === 'EXPENSE'` e `affectsIndriveGoal === true`.
 * Essa é a ÚNICA regra usada na reconciliação: nenhuma leitura de
 * `description`, nenhuma heurística de texto em tempo de consulta. A
 * classificação é decidida uma única vez, estruturalmente, no momento em
 * que a transação é criada/editada (ver `resolveAffectsIndriveGoal`).
 */
function isIndriveOperationalExpenseTx(t: { type: string; affectsIndriveGoal: boolean }): boolean {
  return t.type === 'EXPENSE' && t.affectsIndriveGoal === true
}

export class FinancialService {
  async getCategories(userId: string) {
    return repo.findCategories(userId)
  }

  async createCategory(userId: string, data: any) {
    return repo.createCategory({ ...data, userId })
  }

  async updateCategory(userId: string, id: string, data: any) {
    const cat = await repo.findCategoryById(id, userId)
    if (!cat) throw { statusCode: 404, message: 'Categoria não encontrada' }
    return repo.updateCategory(id, data)
  }

  async deleteCategory(userId: string, id: string) {
    const cat = await repo.findCategoryById(id, userId)
    if (!cat) throw { statusCode: 404, message: 'Categoria não encontrada' }
    return repo.deleteCategory(id)
  }

  /**
   * Garante que, se um projectId for informado, ele corresponda a um
   * Project existente e pertencente ao próprio usuário — evita vincular
   * uma transação a um projeto de outra conta.
   */
  private async assertProjectOwnership(userId: string, projectId?: string | null) {
    if (!projectId) return
    const project = await projectRepo.findById(projectId, userId)
    if (!project) throw { statusCode: 404, message: 'Projeto não encontrado' }
  }

  /**
   * Correção Meta Indrive — Busca a categoria com ownership (o
   * `categoryId` não era validado contra o usuário antes desta correção;
   * como o nome da categoria já precisa ser lido aqui para a
   * classificação automática de Gasolina, a checagem de ownership vem
   * junto, sem custo extra).
   */
  private async getOwnedCategory(userId: string, categoryId: string) {
    const category = await repo.findCategoryById(categoryId, userId)
    if (!category) throw { statusCode: 404, message: 'Categoria não encontrada' }
    return category
  }

  /**
   * Correção Meta Indrive — Decide, estruturalmente, se uma SAÍDA afeta a
   * Meta Indrive:
   * 1. INCOME nunca afeta (a meta líquida só existe para despesas);
   * 2. categoria "Gasolina"/"Combustível" força `true` automaticamente,
   *    sem exigir nenhuma escolha do usuário (o nome da categoria é uma
   *    escolha estrutural do próprio usuário na lista de categorias, não
   *    texto livre de `description` — nunca lemos `description` aqui);
   * 3. caso contrário, respeita o que o usuário marcou explicitamente
   *    (`affectsIndriveGoal`), com `false` como padrão.
   */
  private resolveAffectsIndriveGoal(
    type: string,
    categoryName: string | undefined,
    requested: boolean | undefined
  ): boolean {
    if (type !== 'EXPENSE') return false
    if (GAS_CATEGORY_NAMES.has(normalize(categoryName))) return true
    return requested ?? false
  }

  async getTransactions(userId: string, filters?: { startDate?: string; endDate?: string; type?: string; projectId?: string }) {
    return repo.findTransactions(userId, {
      startDate: filters?.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters?.endDate ? new Date(filters.endDate) : undefined,
      type: filters?.type,
      projectId: filters?.projectId,
    })
  }

  async createTransaction(userId: string, data: any) {
    await this.assertProjectOwnership(userId, data.projectId)
    const category = await this.getOwnedCategory(userId, data.categoryId)
    const affectsIndriveGoal = this.resolveAffectsIndriveGoal(data.type, category.name, data.affectsIndriveGoal)

    const transaction = await repo.createTransaction({
      ...data,
      affectsIndriveGoal,
      userId,
      date: data.date ? new Date(data.date) : new Date(),
    })
    await this.logPaymentActivityIfNeeded(userId, transaction)
    // FinancialTransaction é a fonte de verdade da Meta Indrive; toda
    // criação reconcilia o DailyGoal do dia civil (SP) em que a transação
    // caiu, sem exigir edição manual.
    await this.reconcileDailyGoalFromTransactions(userId, formatDateStringSP(transaction.date))
    return transaction
  }

  /**
   * Fase 4.4A — Ao registrar um pagamento (INCOME) vinculado a um projeto,
   * cria automaticamente um ActivityLog (source: AUTO) na timeline do
   * projeto. Roda uma única vez por transação criada (nunca em update ou
   * delete), então não há risco de duplicidade. Não dispara para EXPENSE
   * nem para transações sem projectId — mantém a timeline focada em
   * marcos comerciais relevantes.
   */
  private async logPaymentActivityIfNeeded(userId: string, transaction: any) {
    if (transaction.type !== 'INCOME' || !transaction.projectId) return
    const amountLabel = `R$ ${Number(transaction.amount).toFixed(2).replace('.', ',')}`
    await activityRepo.create({
      userId,
      projectId: transaction.projectId,
      type: 'PAYMENT_RECEIVED',
      title: 'Pagamento recebido',
      description: transaction.description ? `${amountLabel} — ${transaction.description}` : amountLabel,
      source: 'AUTO',
      occurredAt: transaction.date,
    })
  }

  async updateTransaction(userId: string, id: string, data: any) {
    const t = await repo.findTransactionById(id, userId)
    if (!t) throw { statusCode: 404, message: 'Transação não encontrada' }
    if (data.projectId !== undefined) await this.assertProjectOwnership(userId, data.projectId)

    // Correção Meta Indrive — recalcula affectsIndriveGoal sempre que o
    // tipo, a categoria, ou o próprio vínculo forem tocados neste update;
    // se nada disso vier no payload, preserva a classificação atual (uma
    // edição de valor/descrição não deve silenciosamente "resetar" a
    // classificação da transação).
    const effectiveType = data.type ?? t.type
    let effectiveCategoryName: string | undefined = t.category?.name
    if (data.categoryId !== undefined && data.categoryId !== t.categoryId) {
      const category = await this.getOwnedCategory(userId, data.categoryId)
      effectiveCategoryName = category.name
    }

    const categoryOrTypeChanged = data.type !== undefined || data.categoryId !== undefined
    const affectsIndriveGoalChanged = data.affectsIndriveGoal !== undefined

    if (categoryOrTypeChanged || affectsIndriveGoalChanged) {
      data.affectsIndriveGoal = this.resolveAffectsIndriveGoal(
        effectiveType,
        effectiveCategoryName,
        data.affectsIndriveGoal ?? t.affectsIndriveGoal
      )
    }

    const previousDateStr = formatDateStringSP(t.date)
    const updated = await repo.updateTransaction(id, data)
    const newDateStr = formatDateStringSP(updated.date)

    // Reconcilia o dia antigo (caso valor, tipo, origem, categoria,
    // vínculo com o Indrive ou data tenham mudado o que contava para a
    // meta) e o dia novo, caso a data da transação tenha mudado.
    await this.reconcileDailyGoalFromTransactions(userId, previousDateStr)
    if (newDateStr !== previousDateStr) {
      await this.reconcileDailyGoalFromTransactions(userId, newDateStr)
    }

    return updated
  }

  async deleteTransaction(userId: string, id: string) {
    const t = await repo.findTransactionById(id, userId)
    if (!t) throw { statusCode: 404, message: 'Transação não encontrada' }
    const dateStr = formatDateStringSP(t.date)
    const result = await repo.deleteTransaction(id)
    await this.reconcileDailyGoalFromTransactions(userId, dateStr)
    return result
  }

  /**
   * Período "day" ancorado no dia civil de São Paulo (não em `new Date()`
   * interpretado no fuso do servidor); "week"/"month" seguem a mesma
   * âncora para não divergir do "day". O limite superior de cada período
   * é sempre exclusivo (início do dia seguinte ao último dia), calculado
   * via `getDayRangeSP`.
   */
  async getSummary(userId: string, period: 'day' | 'week' | 'month') {
    const todayStr = getTodayDateStringSP()
    let startDateStr: string
    let endDateStr: string

    if (period === 'day') {
      startDateStr = todayStr
      endDateStr = todayStr
    } else if (period === 'week') {
      const [y, m, d] = todayStr.split('-').map(Number)
      const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
      const sunday = new Date(Date.UTC(y, m - 1, d))
      sunday.setUTCDate(sunday.getUTCDate() - dow)
      const saturday = new Date(sunday)
      saturday.setUTCDate(sunday.getUTCDate() + 6)
      startDateStr = sunday.toISOString().slice(0, 10)
      endDateStr = saturday.toISOString().slice(0, 10)
    } else {
      const [y, m] = todayStr.split('-').map(Number)
      startDateStr = `${y}-${String(m).padStart(2, '0')}-01`
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
      endDateStr = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    }

    const { start } = getDayRangeSP(startDateStr)
    const { end } = getDayRangeSP(endDateStr)
    return repo.getSummary(userId, start, end)
  }

  /** Resolve o `targetAmount`: override explícito > DailyGoal já existente para o dia > UserSettings > 150. */
  private async resolveTargetAmount(userId: string, dateStr: string, override?: number): Promise<number> {
    if (override !== undefined) return override
    const existingGoal = await repo.findDailyGoal(userId, dateStr)
    if (existingGoal) return existingGoal.targetAmount
    const settings = await repo.findUserSettings(userId)
    return settings?.dailyGoalAmount ?? 150
  }

  /**
   * Correção Meta Indrive — Operação central de reconciliação: recalcula
   * `earnedAmount`/`expenseAmount` do DailyGoal do dia (civil, SP) a
   * partir das FinancialTransaction reais daquele dia:
   * - `earnedAmount`: soma das entradas classificadas como ganho Indrive
   *   (`isIndriveIncomeTx`, regra preservada da correção anterior);
   * - `expenseAmount`: soma de TODAS as saídas com
   *   `affectsIndriveGoal = true` — gasolina (classificada
   *   automaticamente na escrita) e qualquer outra despesa vinculada
   *   explicitamente ao Indrive, nunca com base em texto de descrição.
   *
   * `targetAmountOverride` permite ao usuário continuar definindo a meta
   * manualmente (`updateDailyGoal`), sem reintroduzir edição manual de
   * earned/expense.
   */
  async reconcileDailyGoalFromTransactions(userId: string, dateStr: string, targetAmountOverride?: number) {
    const { start, end } = getDayRangeSP(dateStr)
    const transactions = await repo.findTransactionsInRange(userId, start, end)

    const earnedAmount = round2(transactions.filter(isIndriveIncomeTx).reduce((s, t) => s + t.amount, 0))
    const expenseAmount = round2(transactions.filter(isIndriveOperationalExpenseTx).reduce((s, t) => s + t.amount, 0))
    const targetAmount = await this.resolveTargetAmount(userId, dateStr, targetAmountOverride)

    // netAmount = ganho bruto do Indrive - despesas operacionais do Indrive.
    const netAmount = round2(earnedAmount - expenseAmount)
    let status: 'BELOW' | 'ALMOST' | 'REACHED' = 'BELOW'
    if (netAmount >= targetAmount) status = 'REACHED'
    else if (netAmount >= targetAmount * 0.8) status = 'ALMOST'

    return repo.upsertDailyGoalRecord(userId, dateStr, { targetAmount, earnedAmount, expenseAmount, status })
  }

  /** Sempre reconciliado a partir das transações reais — nunca lê um DailyGoal potencialmente desatualizado. */
  async getDailyGoal(userId: string, date: string) {
    return this.reconcileDailyGoalFromTransactions(userId, date)
  }

  /**
   * Única edição manual permitida é `targetAmount` — `earnedAmount`/
   * `expenseAmount`, mesmo que enviados pelo cliente, são ignorados: eles
   * são sempre recalculados a partir das transações reais do dia.
   */
  async updateDailyGoal(userId: string, date: string, data: { targetAmount?: number }) {
    return this.reconcileDailyGoalFromTransactions(userId, date, data.targetAmount)
  }

  /**
   * `startDate`/`endDate` são datas civis "YYYY-MM-DD" em SP; o intervalo
   * de consulta usa `getDayRangeSP` para os dois limites, e `end` passa a
   * ser o INÍCIO do dia civil seguinte ao `endDate` informado (limite
   * exclusivo) — nunca `new Date(str)` cru, que ignora o fuso do usuário.
   */
  async getDailyGoalHistory(userId: string, startDate: string, endDate: string) {
    const { start } = getDayRangeSP(startDate)
    const { end } = getDayRangeSP(endDate)
    return repo.findDailyGoals(userId, start, end)
  }

  getSuggestion(amount: number) {
    return {
      amount,
      despesas: Math.round(amount * 0.7 * 100) / 100,
      reserva: Math.round(amount * 0.2 * 100) / 100,
      investimento: Math.round(amount * 0.1 * 100) / 100,
    }
  }
}