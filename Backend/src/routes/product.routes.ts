import { Router, type RequestHandler, type Router as ExpressRouter } from 'express'
import { PERMISSIONS } from '../constants/permissions.js'
import type { ProductController } from '../controllers/product.controller.js'
import { authorize } from '../middlewares/authorize.js'
import { validate } from '../middlewares/validate.js'
import {
  createProductSchema,
  listProductsQuerySchema,
  productIdParamSchema,
  updateProductSchema,
} from '../validators/product.validator.js'
import {
  bulkPriceApplySchema,
  bulkPricePreviewSchema,
  scheduleIdParamSchema,
  schedulePriceSchema,
} from '../validators/price.validator.js'

export const createProductRoutes = ({
  productController,
  authenticate,
}: {
  productController: ProductController
  authenticate: RequestHandler
}): ExpressRouter => {
  const router = Router()

  router.use(authenticate)

  router.post(
    '/bulk-price/preview',
    authorize(PERMISSIONS.PRODUCT_WRITE),
    validate({ body: bulkPricePreviewSchema }),
    productController.bulkPricePreview,
  )
  router.post(
    '/bulk-price',
    authorize(PERMISSIONS.PRODUCT_WRITE),
    validate({ body: bulkPriceApplySchema }),
    productController.bulkPriceApply,
  )

  router.get(
    '/',
    authorize(PERMISSIONS.PRODUCT_READ),
    validate({ query: listProductsQuerySchema }),
    productController.list,
  )
  router.get(
    '/:id',
    authorize(PERMISSIONS.PRODUCT_READ),
    validate({ params: productIdParamSchema }),
    productController.getById,
  )
  router.post(
    '/',
    authorize(PERMISSIONS.PRODUCT_WRITE),
    validate({ body: createProductSchema }),
    productController.create,
  )
  router.put(
    '/:id',
    authorize(PERMISSIONS.PRODUCT_WRITE),
    validate({ params: productIdParamSchema, body: updateProductSchema }),
    productController.update,
  )
  router.delete(
    '/:id',
    authorize(PERMISSIONS.PRODUCT_WRITE),
    validate({ params: productIdParamSchema }),
    productController.deactivate,
  )
  router.post(
    '/:id/barcode',
    authorize(PERMISSIONS.PRODUCT_WRITE),
    validate({ params: productIdParamSchema }),
    productController.generateBarcode,
  )
  router.get(
    '/:id/price-history',
    authorize(PERMISSIONS.PRODUCT_READ),
    validate({ params: productIdParamSchema }),
    productController.listPriceHistory,
  )
  router.get(
    '/:id/scheduled-price',
    authorize(PERMISSIONS.PRODUCT_READ),
    validate({ params: productIdParamSchema }),
    productController.getScheduledPrice,
  )
  router.post(
    '/:id/scheduled-price',
    authorize(PERMISSIONS.PRODUCT_WRITE),
    validate({ params: productIdParamSchema, body: schedulePriceSchema }),
    productController.schedulePrice,
  )
  router.delete(
    '/:id/scheduled-price/:scheduleId',
    authorize(PERMISSIONS.PRODUCT_WRITE),
    validate({ params: scheduleIdParamSchema }),
    productController.cancelScheduledPrice,
  )

  return router
}
