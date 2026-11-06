import type { RequestHandler } from 'express'
import { PERMISSIONS } from '../constants/permissions.js'
import type {
  CheckoutActor,
  TransactionActor,
  TransactionService,
} from '../services/transaction.service.js'
import type { AuthUser } from '../types/auth.js'
import { parseIdempotencyKey } from '../utils/idempotency.js'
import { requireActor } from '../utils/request.js'
import { sendSuccess } from '../utils/response.js'
import type {
  CheckoutInput,
  ListTransactionsQuery,
} from '../validators/transaction.validator.js'

export interface TransactionController {
  list: RequestHandler
  checkout: RequestHandler
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

  checkout: async (req, res) => {
    const input = req.validated?.body as CheckoutInput
    const user: AuthUser = requireActor(req)
    const actor: CheckoutActor = {
      id: user.id,
      name: user.name,
      canViewCostPrice: user.permissions.includes(PERMISSIONS.COST_PRICE_READ),
    }
    const idempotencyKey = parseIdempotencyKey(req.header('Idempotency-Key'))
    const result = await transactionService.checkout(input, actor, idempotencyKey)

    return sendSuccess(res, {
      statusCode: result.replayed ? 200 : 201,
      message: 'Transaksi berhasil',
      data: result.transaction,
    })
  },
})
