import { FastifyRequest, FastifyReply } from 'fastify'
import { FinancialService } from '../services/financial.service'
import { idParamSchema } from '../validators/common.validator'
import {
  createCategorySchema,
  updateCategorySchema,
  createTransactionSchema,
  updateTransactionSchema,
  transactionsQuerySchema,
  summaryQuerySchema,
  suggestionQuerySchema,
  dailyGoalQuerySchema,
  updateDailyGoalSchema,
  dailyGoalHistoryQuerySchema,
} from '../validators/financial.validator'

const service = new FinancialService()

export const financialController = {
  async getCategories(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(await service.getCategories(request.userId))
  },

  async createCategory(request: FastifyRequest, reply: FastifyReply) {
    const data = createCategorySchema.parse(request.body)
    return reply.status(201).send(await service.createCategory(request.userId, data))
  },

  async updateCategory(request: FastifyRequest, reply: FastifyReply) {
    const { id } = idParamSchema.parse(request.params)
    const data = updateCategorySchema.parse(request.body)
    return reply.send(await service.updateCategory(request.userId, id, data))
  },

  async deleteCategory(request: FastifyRequest, reply: FastifyReply) {
    const { id } = idParamSchema.parse(request.params)
    await service.deleteCategory(request.userId, id)
    return reply.status(204).send()
  },

  async getTransactions(request: FastifyRequest, reply: FastifyReply) {
    const query = transactionsQuerySchema.parse(request.query)
    return reply.send(await service.getTransactions(request.userId, query))
  },

  async createTransaction(request: FastifyRequest, reply: FastifyReply) {
    const data = createTransactionSchema.parse(request.body)
    return reply.status(201).send(await service.createTransaction(request.userId, data))
  },

  async updateTransaction(request: FastifyRequest, reply: FastifyReply) {
    const { id } = idParamSchema.parse(request.params)
    const data = updateTransactionSchema.parse(request.body)
    return reply.send(await service.updateTransaction(request.userId, id, data))
  },

  async deleteTransaction(request: FastifyRequest, reply: FastifyReply) {
    const { id } = idParamSchema.parse(request.params)
    await service.deleteTransaction(request.userId, id)
    return reply.status(204).send()
  },

  async getSummary(request: FastifyRequest, reply: FastifyReply) {
    const { period } = summaryQuerySchema.parse(request.query)
    return reply.send(await service.getSummary(request.userId, period))
  },

  async getDailyGoal(request: FastifyRequest, reply: FastifyReply) {
    const query = dailyGoalQuerySchema.parse(request.query)
    const d = query.date || new Date().toISOString().split('T')[0]
    return reply.send(await service.getDailyGoal(request.userId, d))
  },

  async updateDailyGoal(request: FastifyRequest, reply: FastifyReply) {
    const query = dailyGoalQuerySchema.parse(request.query)
    const data = updateDailyGoalSchema.parse(request.body)
    const d = query.date || new Date().toISOString().split('T')[0]
    return reply.send(await service.updateDailyGoal(request.userId, d, data))
  },

  async getDailyGoalHistory(request: FastifyRequest, reply: FastifyReply) {
    const query = dailyGoalHistoryQuerySchema.parse(request.query)
    const end = query.endDate || new Date().toISOString().split('T')[0]
    const start = query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    return reply.send(await service.getDailyGoalHistory(request.userId, start, end))
  },

  async getSuggestion(request: FastifyRequest, reply: FastifyReply) {
    const { amount } = suggestionQuerySchema.parse(request.query)
    return reply.send(service.getSuggestion(amount))
  },
}
