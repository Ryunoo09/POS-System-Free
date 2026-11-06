import { Router, type RequestHandler, type Router as ExpressRouter } from 'express'
import { PERMISSIONS } from '../constants/permissions.js'
import type { TransactionController } from '../controllers/transaction.controller.js'
import { authorize } from '../middlewares/authorize.js'
import { validate } from '../middlewares/validate.js'
import {
  checkoutSchema,
  listTransactionsQuerySchema,
  transactionIdParamSchema,
} from '../validators/transaction.validator.js'

export const createTransactionRoutes = ({
  transactionController,
  authenticate,
}: {
  transactionController: TransactionController
  authenticate: RequestHandler
}): ExpressRouter => {
  const router = Router()

  router.use(authenticate)

  router.post(
    '/',
    authorize(PERMISSIONS.TRANSACTION_CREATE),
    validate({ body: checkoutSchema }),
    transactionController.checkout,
  )

  router.get(
    '/',
    authorize([PERMISSIONS.TRANSACTION_READ_ALL, PERMISSIONS.TRANSACTION_READ_OWN]),
    validate({ query: listTransactionsQuerySchema }),
    transactionController.list,
  )

  router.get(
    '/cashiers',
    authorize(PERMISSIONS.TRANSACTION_READ_ALL),
    transactionController.cashiers,
  )

  router.get(
    '/:id',
    authorize([PERMISSIONS.TRANSACTION_READ_ALL, PERMISSIONS.TRANSACTION_READ_OWN]),
    validate({ params: transactionIdParamSchema }),
    transactionController.detail,
  )

  return router
}
