import { FastifyRequest, FastifyReply } from 'fastify'
import { DashboardService } from '../services/dashboard.service'
const service = new DashboardService()

export const dashboardController = {
  async get(req: FastifyRequest, rep: FastifyReply) { return rep.send(await service.getDashboard(req.userId)) },
}
