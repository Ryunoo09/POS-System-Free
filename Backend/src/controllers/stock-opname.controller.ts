import type { Request, RequestHandler } from 'express'
import type { OpnameActor, StockOpnameService } from '../services/stock-opname.service.js'
import type { AuthUser } from '../types/auth.js'
import { auditContextFrom, requireActor } from '../utils/request.js'
import { sendSuccess } from '../utils/response.js'
import type {
  CreateStockOpnameInput,
  ListStockOpnamesQuery,
  RejectStockOpnameInput,
  UpdateStockOpnameItemInput,
} from '../validators/stock-opname.validator.js'

export interface StockOpnameController {
  list: RequestHandler
  create: RequestHandler
  detail: RequestHandler
  start: RequestHandler
  updateItem: RequestHandler
  submit: RequestHandler
  approve: RequestHandler
  reject: RequestHandler
  complete: RequestHandler
  cancel: RequestHandler
}

const toActor = (user: AuthUser, req: Request): OpnameActor => ({
  id: user.id,
  ...auditContextFrom(req),
})

export const createStockOpnameController = ({
  stockOpnameService,
}: {
  stockOpnameService: StockOpnameService
}): StockOpnameController => ({
  list: async (req, res) => {
    const query = req.validated?.query as ListStockOpnamesQuery
    const result = await stockOpnameService.list(query)

    return sendSuccess(res, { data: result.items, meta: result.meta })
  },

  create: async (req, res) => {
    const input = req.validated?.body as CreateStockOpnameInput
    const session = await stockOpnameService.create(input, toActor(requireActor(req), req))

    return sendSuccess(res, { data: session, statusCode: 201 })
  },

  detail: async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    const session = await stockOpnameService.detail(id)

    return sendSuccess(res, { data: session })
  },

  start: async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    const session = await stockOpnameService.start(id, toActor(requireActor(req), req))

    return sendSuccess(res, { data: session })
  },

  updateItem: async (req, res) => {
    const { id, itemId } = req.validated?.params as { id: string; itemId: string }
    const input = req.validated?.body as UpdateStockOpnameItemInput
    const item = await stockOpnameService.updateItem(
      id,
      itemId,
      input,
      toActor(requireActor(req), req),
    )

    return sendSuccess(res, { data: item })
  },

  submit: async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    const session = await stockOpnameService.submit(id, toActor(requireActor(req), req))

    return sendSuccess(res, { data: session })
  },

  approve: async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    const session = await stockOpnameService.approve(id, toActor(requireActor(req), req))

    return sendSuccess(res, { data: session })
  },

  reject: async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    const input = req.validated?.body as RejectStockOpnameInput
    const session = await stockOpnameService.reject(id, input, toActor(requireActor(req), req))

    return sendSuccess(res, { data: session })
  },

  complete: async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    const session = await stockOpnameService.complete(id, toActor(requireActor(req), req))

    return sendSuccess(res, { data: session })
  },

  cancel: async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    const session = await stockOpnameService.cancel(id, toActor(requireActor(req), req))

    return sendSuccess(res, { data: session })
  },
})
