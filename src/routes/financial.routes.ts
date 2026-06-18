import { FastifyInstance } from 'fastify'
import { financialController } from '../controllers/financial.controller'
import { authenticate } from '../middlewares/auth'

export async function financialRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate)

  // Categories
  fastify.get('/financial/categories', financialController.getCategories)
  fastify.post('/financial/categories', financialController.createCategory)
  fastify.put('/financial/categories/:id', financialController.updateCategory)
  fastify.delete('/financial/categories/:id', financialController.deleteCategory)

  // Transactions
  fastify.get('/financial/transactions', financialController.getTransactions)
  fastify.post('/financial/transactions', financialController.createTransaction)
  fastify.put('/financial/transactions/:id', financialController.updateTransaction)
  fastify.delete('/financial/transactions/:id', financialController.deleteTransaction)

  // Summary
  fastify.get('/financial/summary', financialController.getSummary)
  fastify.get('/financial/suggestion', financialController.getSuggestion)

  // Daily Goal (Indrive)
  fastify.get('/financial/daily-goal', financialController.getDailyGoal)
  fastify.put('/financial/daily-goal', financialController.updateDailyGoal)
  fastify.get('/financial/daily-goal/history', financialController.getDailyGoalHistory)
}
