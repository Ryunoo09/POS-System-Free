import { Router, type RequestHandler, type Router as ExpressRouter } from 'express'
import { PERMISSIONS } from '../constants/permissions.js'
import type { PurchaseController } from '../controllers/purchase.controller.js'
import { authorize } from '../middlewares/authorize.js'
import { validate } from '../middlewares/validate.js'
import {
  createPurchaseOrderSchema,
  listPurchaseOrdersQuerySchema,
  purchaseOrderIdParamSchema,
} from '../validators/purchase.validator.js'

export const createPurchaseRoutes = ({
  purchaseController,
  authenticate,
}: {
  purchaseController: PurchaseController
  authenticate: RequestHandler
}): ExpressRouter => {
  const router = Router()

  router.use(authenticate)

  router.get(
    '/',
    authorize(PERMISSIONS.PURCHASE_READ),
    validate({ query: listPurchaseOrdersQuerySchema }),
    purchaseController.list,
  )
  router.post(
    '/',
    authorize(PERMISSIONS.PURCHASE_WRITE),
    validate({ body: createPurchaseOrderSchema }),
    purchaseController.create,
  )
  router.get(
    '/:id',
    authorize(PERMISSIONS.PURCHASE_READ),
    validate({ params: purchaseOrderIdParamSchema }),
    purchaseController.detail,
  )
  router.post(
    '/:id/order',
    authorize(PERMISSIONS.PURCHASE_WRITE),
    validate({ params: purchaseOrderIdParamSchema }),
    purchaseController.order,
  )
  router.post(
    '/:id/receive',
    authorize(PERMISSIONS.PURCHASE_WRITE),
    validate({ params: purchaseOrderIdParamSchema }),
    purchaseController.receive,
  )
  router.post(
    '/:id/cancel',
    authorize(PERMISSIONS.PURCHASE_WRITE),
    validate({ params: purchaseOrderIdParamSchema }),
    purchaseController.cancel,
  )

  return router
}