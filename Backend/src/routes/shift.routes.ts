import { Router, type RequestHandler, type Router as ExpressRouter } from 'express'
import { PERMISSIONS } from '../constants/permissions.js'
import type { ShiftController } from '../controllers/shift.controller.js'
import { authorize } from '../middlewares/authorize.js'
import { validate } from '../middlewares/validate.js'
import {
  openShiftSchema,
  closeShiftSchema,
  cashMovementSchema,
} from '../validators/shift.validator.js'

export const createShiftRoutes = ({
  shiftController,
  authenticate,
}: {
  shiftController: ShiftController
  authenticate: RequestHandler
}): ExpressRouter => {
  const router = Router()

  router.use(authenticate)

  router.get(
    '/current',
    authorize([PERMISSIONS.SHIFT_READ]),
    shiftController.getCurrent,
  )

  router.get(
    '/summary',
    authorize([PERMISSIONS.SHIFT_READ]),
    shiftController.getSummary,
  )

  router.get(
    '/history',
    authorize([PERMISSIONS.SHIFT_READ]),
    shiftController.getHistory,
  )

  router.post(
    '/open',
    authorize([PERMISSIONS.SHIFT_MANAGE]),
    validate({ body: openShiftSchema }),
    shiftController.open,
  )

  router.post(
    '/close',
    authorize([PERMISSIONS.SHIFT_MANAGE]),
    validate({ body: closeShiftSchema }),
    shiftController.close,
  )

  router.post(
    '/cash-movement',
    authorize([PERMISSIONS.SHIFT_MANAGE]),
    validate({ body: cashMovementSchema }),
    shiftController.createCashMovement,
  )

  return router
}
