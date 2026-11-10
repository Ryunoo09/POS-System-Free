import type { Request, RequestHandler } from 'express'
import type { PurchaseActor, PurchaseService } from '../services/purchase.service.js'
import type { AuthUser } from '../types/auth.js'
import { auditContextFrom, requireActor } from '../utils/request.js'
import { sendSuccess } from '../utils/response.js'
import type { CreatePurchaseOrderInput, ListPurchaseOrdersQuery } from '../validators/purchase.validator.js'

export interface PurchaseController {
  list: RequestHandler
  detail: RequestHandler
  create: RequestHandler
  order: RequestHandler
  receive: RequestHandler
  cancel: RequestHandler
}

const toActor = (user: AuthUser, req: Request): PurchaseActor => ({
  id: user.id,
  ...auditContextFrom(req),
})

export const createPurchaseController = ({
  purchaseService,
}: {
  purchaseService: PurchaseService
}): PurchaseController => ({
  list: async (req, res) => {
    const query = req.validated?.query as ListPurchaseOrdersQuery
    const result = await purchaseService.list(query)

    return sendSuccess(res, { data: result.items, meta: result.meta })
  },

  detail: async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    const data = await purchaseService.detail(id)

    return sendSuccess(res, { data })
  },

  create: async (req, res) => {
    const input = req.validated?.body as CreatePurchaseOrderInput
    const actor = toActor(requireActor(req), req)
    const data = await purchaseService.create(input, actor)

    return sendSuccess(res, { statusCode: 201, message: 'Purchase order berhasil dibuat', data })
  },

  order: async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    const actor = toActor(requireActor(req), req)
    const data = await purchaseService.order(id, actor)

    return sendSuccess(res, { message: 'Purchase order ditandai dipesan', data })
  },

  receive: async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    const actor = toActor(requireActor(req), req)
    const data = await purchaseService.receive(id, actor)

    return sendSuccess(res, { message: 'Penerimaan barang berhasil dicatat', data })
  },

  cancel: async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    const actor = toActor(requireActor(req), req)
    const data = await purchaseService.cancel(id, actor)

    return sendSuccess(res, { message: 'Purchase order dibatalkan', data })
  },
})