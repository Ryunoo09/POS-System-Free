import type { Request, RequestHandler } from 'express'
import type { OpnameActor, StockOpnameService } from '../services/stock-opname.service.js'
import type { AuthUser } from '../types/auth.js'
import { auditContextFrom, requireActor } from '../utils/request.js'
import { sendSuccess } from '../utils/response.js'
import type {
  CreateStockOpnameInput,
  ListStockOpnamesQuery,
} from '../validators/stock-opname.validator.js'

export interface StockOpnameController {
  list: RequestHandler
  create: RequestHandler
  detail: RequestHandler
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
})
