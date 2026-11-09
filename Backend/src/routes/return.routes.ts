import { Router, type RequestHandler, type Router as ExpressRouter } from 'express'
import { PERMISSIONS } from '../constants/permissions.js'
import type { ReturnController } from '../controllers/return.controller.js'
import { authorize } from '../middlewares/authorize.js'
import { validate } from '../middlewares/validate.js'
import {
  createReturnSchema,
  listReturnsQuerySchema,
  returnIdParamSchema,
} from '../validators/return.validator.js'

export const createReturnRoutes = ({
  returnController,
  authenticate,
}: {
  returnController: ReturnController
  authenticate: RequestHandler
}): ExpressRouter => {
  const router = Router()

  router.use(authenticate)

  router.post(
    '/',
    authorize(PERMISSIONS.RETURN_CREATE),
    validate({ body: createReturnSchema }),
    returnController.create,
  )

  router.get(
    '/',
    authorize(PERMISSIONS.RETURN_READ),
    validate({ query: listReturnsQuerySchema }),
    returnController.list,
  )

  router.get(
    '/:id',
    authorize(PERMISSIONS.RETURN_READ),
    validate({ params: returnIdParamSchema }),
    returnController.detail,
  )

  return router
}