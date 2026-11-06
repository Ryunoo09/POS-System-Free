import { Router, type RequestHandler, type Router as ExpressRouter } from 'express'
import { PERMISSIONS } from '../constants/permissions.js'
import type { TransactionController } from '../controllers/transaction.controller.js'
import { authorize } from '../middlewares/authorize.js'
import { validate } from '../middlewares/validate.js'
import { listTransactionsQuerySchema } from '../validators/transaction.validator.js'

export const createTransactionRoutes = ({
  transactionController,
  authenticate,
}: {
  transactionController: TransactionController
  authenticate: RequestHandler
}): ExpressRouter => {
  const router = Router()

  router.use(authenticate)
  router.use(
    authorize([PERMISSIONS.TRANSACTION_READ_ALL, PERMISSIONS.TRANSACTION_READ_OWN]),
  )

  router.get(
    '/',
    validate({ query: listTransactionsQuerySchema }),
    transactionController.list,
  )

  return router
}