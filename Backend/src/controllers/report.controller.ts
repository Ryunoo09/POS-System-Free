import type { RequestHandler } from 'express'
import type { ReportService } from '../services/report.service.js'
import { sendSuccess } from '../utils/response.js'
import type {
  CashierReportQuery,
  ProductReportQuery,
  SalesReportQuery,
} from '../validators/report.validator.js'

export interface ReportController {
  getSales: RequestHandler
  getProducts: RequestHandler
  getCashiers: RequestHandler
}

export const createReportController = ({
  reportService,
}: {
  reportService: ReportService
}): ReportController => ({
  getSales: async (req, res) => {
    const query = req.validated?.query as SalesReportQuery
    const data = await reportService.getSales(query)

    return sendSuccess(res, { data })
  },

  getProducts: async (req, res) => {
    const query = req.validated?.query as ProductReportQuery
    const { summary, rows, meta } = await reportService.getProducts(query)

    return sendSuccess(res, { data: { summary, rows }, meta })
  },

  getCashiers: async (req, res) => {
    const query = req.validated?.query as CashierReportQuery
    const data = await reportService.getCashiers(query)

    return sendSuccess(res, { data })
  },
})
