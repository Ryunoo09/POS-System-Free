import { Router, type RequestHandler, type Router as ExpressRouter } from 'express'
import { PERMISSIONS } from '../constants/permissions.js'
import type { StockOpnameController } from '../controllers/stock-opname.controller.js'
import { authorize } from '../middlewares/authorize.js'
import { validate } from '../middlewares/validate.js'
import {
  createStockOpnameSchema,
  listStockOpnamesQuerySchema,
  opnameItemParamSchema,
  stockOpnameIdParamSchema,
  updateStockOpnameItemSchema,
} from '../validators/stock-opname.validator.js'

export const createStockOpnameRoutes = ({
  stockOpnameController,
  authenticate,
}: {
  stockOpnameController: StockOpnameController
  authenticate: RequestHandler
}): ExpressRouter => {
  const router = Router()

  router.use(authenticate)

  router.get(
    '/',
    authorize(PERMISSIONS.STOCK_OPNAME_READ),
    validate({ query: listStockOpnamesQuerySchema }),
    stockOpnameController.list,
  )
  router.post(
    '/',
    authorize(PERMISSIONS.STOCK_OPNAME_MANAGE),
    validate({ body: createStockOpnameSchema }),
    stockOpnameController.create,
  )
  router.get(
    '/:id',
    authorize(PERMISSIONS.STOCK_OPNAME_READ),
    validate({ params: stockOpnameIdParamSchema }),
    stockOpnameController.detail,
  )
  router.post(
    '/:id/start',
    authorize(PERMISSIONS.STOCK_OPNAME_MANAGE),
    validate({ params: stockOpnameIdParamSchema }),
    stockOpnameController.start,
  )
  router.patch(
    '/:id/items/:itemId',
    authorize(PERMISSIONS.STOCK_OPNAME_MANAGE),
    validate({ params: opnameItemParamSchema, body: updateStockOpnameItemSchema }),
    stockOpnameController.updateItem,
  )
  router.post(
    '/:id/submit',
    authorize(PERMISSIONS.STOCK_OPNAME_MANAGE),
    validate({ params: stockOpnameIdParamSchema }),
    stockOpnameController.submit,
  )
  router.post(
    '/:id/approve',
    authorize(PERMISSIONS.STOCK_OPNAME_APPROVE),
    validate({ params: stockOpnameIdParamSchema }),
    stockOpnameController.approve,
  )

  return router
}
