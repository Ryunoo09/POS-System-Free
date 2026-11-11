import { Router, type RequestHandler, type Router as ExpressRouter } from 'express'
import { PERMISSIONS } from '../constants/permissions.js'
import type { StockOpnameController } from '../controllers/stock-opname.controller.js'
import { authorize } from '../middlewares/authorize.js'
import { validate } from '../middlewares/validate.js'
import {
  createStockOpnameSchema,
  listStockOpnamesQuerySchema,
  stockOpnameIdParamSchema,
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

  return router
}
