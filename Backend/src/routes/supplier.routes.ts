import { Router, type RequestHandler, type Router as ExpressRouter } from 'express'
import { PERMISSIONS } from '../constants/permissions.js'
import type { SupplierController } from '../controllers/supplier.controller.js'
import { authorize } from '../middlewares/authorize.js'
import { validate } from '../middlewares/validate.js'
import {
  createSupplierSchema,
  listSuppliersQuerySchema,
  supplierIdParamSchema,
  updateSupplierSchema,
} from '../validators/supplier.validator.js'

export const createSupplierRoutes = ({
  supplierController,
  authenticate,
}: {
  supplierController: SupplierController
  authenticate: RequestHandler
}): ExpressRouter => {
  const router = Router()

  router.use(authenticate)

  router.get(
    '/',
    authorize(PERMISSIONS.SUPPLIER_READ),
    validate({ query: listSuppliersQuerySchema }),
    supplierController.list,
  )
  router.post(
    '/',
    authorize(PERMISSIONS.SUPPLIER_WRITE),
    validate({ body: createSupplierSchema }),
    supplierController.create,
  )
  router.get(
    '/:id',
    authorize(PERMISSIONS.SUPPLIER_READ),
    validate({ params: supplierIdParamSchema }),
    supplierController.detail,
  )
  router.put(
    '/:id',
    authorize(PERMISSIONS.SUPPLIER_WRITE),
    validate({ params: supplierIdParamSchema, body: updateSupplierSchema }),
    supplierController.update,
  )
  router.delete(
    '/:id',
    authorize(PERMISSIONS.SUPPLIER_WRITE),
    validate({ params: supplierIdParamSchema }),
    supplierController.remove,
  )

  return router
}