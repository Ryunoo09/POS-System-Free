import type { Request, RequestHandler } from 'express'
import { PERMISSIONS } from '../constants/permissions.js'
import type { InventoryActor, InventoryService } from '../services/inventory.service.js'
import type { AuthUser } from '../types/auth.js'
import { auditContextFrom, requireActor } from '../utils/request.js'
import { sendSuccess } from '../utils/response.js'
import type {
  AdjustStockInput,
  ListInventoryQuery,
  ListLowStockQuery,
  ListMovementsQuery,
} from '../validators/inventory.validator.js'

export interface InventoryController {
  list: RequestHandler
  listLowStock: RequestHandler
  listMovements: RequestHandler
  adjust: RequestHandler
}

const toActor = (user: AuthUser, req: Request): InventoryActor => ({
  id: user.id,
  name: user.name,
  canViewCostPrice: user.permissions.includes(PERMISSIONS.COST_PRICE_READ),
  ...auditContextFrom(req),
})

export const createInventoryController = ({
  inventoryService,
}: {
  inventoryService: InventoryService
}): InventoryController => ({
  list: async (req, res) => {
    const query = req.validated?.query as ListInventoryQuery
    const result = await inventoryService.list(query)

    return sendSuccess(res, { data: result.items, meta: result.meta })
  },

  listLowStock: async (req, res) => {
    const query = req.validated?.query as ListLowStockQuery
    const result = await inventoryService.listLowStock(query, toActor(requireActor(req), req))

    return sendSuccess(res, { data: result.items, meta: result.meta })
  },

  listMovements: async (req, res) => {
    const query = req.validated?.query as ListMovementsQuery
    const result = await inventoryService.listMovements(query)

    return sendSuccess(res, { data: result.items, meta: result.meta })
  },

  adjust: async (req, res) => {
    const input = req.validated?.body as AdjustStockInput
    const data = await inventoryService.adjust(input, toActor(requireActor(req), req))

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Stok berhasil disesuaikan',
      data,
    })
  },
})
