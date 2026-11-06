import { Router, type RequestHandler, type Router as ExpressRouter } from 'express'
import { PERMISSIONS } from '../constants/permissions.js'
import type { InventoryController } from '../controllers/inventory.controller.js'
import { authorize } from '../middlewares/authorize.js'
import { validate } from '../middlewares/validate.js'
import { listLowStockQuerySchema } from '../validators/inventory.validator.js'

export const createInventoryRoutes = ({
  inventoryController,
  authenticate,
}: {
  inventoryController: InventoryController
  authenticate: RequestHandler
}): ExpressRouter => {
  const router = Router()

  router.use(authenticate)
  router.use(authorize(PERMISSIONS.INVENTORY_READ))

  router.get(
    '/low-stock',
    validate({ query: listLowStockQuerySchema }),
    inventoryController.listLowStock,
  )

  return router
}