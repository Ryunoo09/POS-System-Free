import type { RequestHandler } from 'express'
import type { InventoryService } from '../services/inventory.service.js'
import { sendSuccess } from '../utils/response.js'
import type { ListLowStockQuery } from '../validators/inventory.validator.js'

export interface InventoryController {
  listLowStock: RequestHandler
}

export const createInventoryController = ({
  inventoryService,
}: {
  inventoryService: InventoryService
}): InventoryController => ({
  listLowStock: async (req, res) => {
    const query = req.validated?.query as ListLowStockQuery
    const result = await inventoryService.listLowStock(query)

    return sendSuccess(res, { data: result.items, meta: result.meta })
  },
})