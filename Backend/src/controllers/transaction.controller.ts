import type { RequestHandler } from 'express'
import { PERMISSIONS } from '../constants/permissions.js'
import type { TransactionActor, TransactionService } from '../services/transaction.service.js'
import { requireActor } from '../utils/request.js'
import { sendSuccess } from '../utils/response.js'
import type { ListTransactionsQuery } from '../validators/transaction.validator.js'

export interface TransactionController {
  list: RequestHandler
}

export const createTransactionController = ({
  transactionService,
}: {
  transactionService: TransactionService
}): TransactionController => ({
  list: async (req, res) => {
    const query = req.validated?.query as ListTransactionsQuery
    const user = requireActor(req)
    const actor: TransactionActor = {
      userId: user.id,
      canReadAll: user.permissions.includes(PERMISSIONS.TRANSACTION_READ_ALL),
    }
    const result = await transactionService.list(query, actor)

    return sendSuccess(res, { data: result.items, meta: result.meta })
  },
})