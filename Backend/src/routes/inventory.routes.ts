import { Router, type RequestHandler, type Router as ExpressRouter } from 'express'
import { PERMISSIONS } from '../constants/permissions.js'
import type { InventoryController } from '../controllers/inventory.controller.js'
import { authorize } from '../middlewares/authorize.js'
import { validate } from '../middlewares/validate.js'
import {
  adjustStockSchema,
  listInventoryQuerySchema,
  listLowStockQuerySchema,
  listMovementsQuerySchema,
} from '../validators/inventory.validator.js'

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
    '/',
    validate({ query: listInventoryQuerySchema }),
    inventoryController.list,
  )
  router.get(
    '/low-stock',
    validate({ query: listLowStockQuerySchema }),
    inventoryController.listLowStock,
  )
  router.get(
    '/movements',
    validate({ query: listMovementsQuerySchema }),
    inventoryController.listMovements,
  )

  router.post(
    '/adjustments',
    authorize(PERMISSIONS.INVENTORY_ADJUST),
    validate({ body: adjustStockSchema }),
    inventoryController.adjust,
  )

  return router
}