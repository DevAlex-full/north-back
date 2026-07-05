import { FastifyInstance } from 'fastify'
import { projectController } from '../controllers/project.controller'
import { authenticate } from '../middlewares/auth'

export async function projectRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate)

  // Rotas existentes (preservadas integralmente)
  fastify.get('/projects',                              projectController.getAll)
  fastify.get('/projects/:id',                          projectController.getOne)
  fastify.get('/projects/:id/finance',                  projectController.getFinance)
  fastify.post('/projects',                             projectController.create)
  fastify.put('/projects/:id',                          projectController.update)
  fastify.delete('/projects/:id',                       projectController.delete)
  fastify.post('/projects/:id/tasks',                   projectController.createTask)
  fastify.put('/projects/:id/tasks/:taskId',            projectController.updateTask)
  fastify.delete('/projects/:id/tasks/:taskId',         projectController.deleteTask)

  // Fase 4.3: Subtarefas
  fastify.post('/projects/:id/tasks/:taskId/subtasks',                    projectController.createSubTask)
  fastify.put('/projects/:id/tasks/:taskId/subtasks/:subId',              projectController.updateSubTask)
  fastify.delete('/projects/:id/tasks/:taskId/subtasks/:subId',           projectController.deleteSubTask)
}