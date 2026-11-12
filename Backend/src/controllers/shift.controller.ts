import type { RequestHandler } from 'express'
import type { ShiftService } from '../services/shift.service.js'
import { buildPaginationMeta } from '../utils/pagination.js'
import { requireActor } from '../utils/request.js'
import { sendSuccess } from '../utils/response.js'
import type {
  OpenShiftInput,
  CloseShiftInput,
  CashMovementInput,
  ShiftHistoryQuery,
} from '../validators/shift.validator.js'

export interface ShiftController {
  getCurrent: RequestHandler
  open: RequestHandler
  close: RequestHandler
  createCashMovement: RequestHandler
  getSummary: RequestHandler
  getHistory: RequestHandler
}

export const createShiftController = ({
  shiftService,
}: {
  shiftService: ShiftService
}): ShiftController => ({
  getCurrent: async (req, res) => {
    const actor = requireActor(req)
    const data = await shiftService.getCurrentShift(actor.id)
    return sendSuccess(res, { data })
  },

  open: async (req, res) => {
    const actor = requireActor(req)
    const input = req.validated?.body as OpenShiftInput
    const data = await shiftService.openShift(actor.id, input)
    return sendSuccess(res, { statusCode: 201, message: 'Shift kasir berhasil dibuka', data })
  },

  close: async (req, res) => {
    const actor = requireActor(req)
    const input = req.validated?.body as CloseShiftInput
    const data = await shiftService.closeShift(actor.id, input)
    return sendSuccess(res, { message: 'Shift kasir berhasil ditutup', data })
  },

  createCashMovement: async (req, res) => {
    const actor = requireActor(req)
    const input = req.validated?.body as CashMovementInput
    const data = await shiftService.createCashMovement(actor.id, input)
    return sendSuccess(res, {
      statusCode: 201,
      message: input.type === 'CASH_IN' ? 'Kas masuk berhasil dicatat' : 'Kas keluar berhasil dicatat',
      data,
    })
  },

  getSummary: async (req, res) => {
    const actor = requireActor(req)
    const data = await shiftService.getCurrentShiftSummary(actor.id)
    return sendSuccess(res, { data })
  },

  getHistory: async (req, res) => {
    const actor = requireActor(req)
    const query = req.validated?.query as ShiftHistoryQuery

    const cashierId = actor.role === 'CASHIER' ? actor.id : query.cashier_id

    const { items, total } = await shiftService.getHistory({
      cashierId,
      status: query.status,
      page: query.page,
      limit: query.limit,
    })

    return sendSuccess(res, {
      data: items,
      meta: buildPaginationMeta(query.page, query.limit, total),
    })
  },
})
