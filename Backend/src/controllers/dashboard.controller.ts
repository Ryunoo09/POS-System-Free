import type { RequestHandler } from 'express'
import type { DashboardService } from '../services/dashboard.service.js'
import { sendSuccess } from '../utils/response.js'
import type { DashboardQuery, TopProductsQuery } from '../validators/dashboard.validator.js'

export interface DashboardController {
  getSummary: RequestHandler
  getSales: RequestHandler
  getTopProducts: RequestHandler
}

export const createDashboardController = ({
  dashboardService,
}: {
  dashboardService: DashboardService
}): DashboardController => ({
  getSummary: async (req, res) => {
    const query = req.validated?.query as DashboardQuery
    const data = await dashboardService.getSummary(query)

    return sendSuccess(res, { data })
  },

  getSales: async (req, res) => {
    const query = req.validated?.query as DashboardQuery
    const data = await dashboardService.getSales(query)

    return sendSuccess(res, { data })
  },

  getTopProducts: async (req, res) => {
    const query = req.validated?.query as TopProductsQuery
    const data = await dashboardService.getTopProducts(query, query.limit)

    return sendSuccess(res, { data })
  },
})