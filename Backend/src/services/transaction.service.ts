import { toTransactionDto, type TransactionDto } from '../mappers/transaction.mapper.js'
import type { TransactionRepository } from '../repositories/transaction.repository.js'
import type { PaginationMeta } from '../types/http.js'
import { resolveDateRange } from '../utils/date-range.js'
import { buildPaginationMeta, toSkip } from '../utils/pagination.js'
import type { ListTransactionsQuery } from '../validators/transaction.validator.js'

export interface TransactionActor {
  userId: string
  canReadAll: boolean
}

export interface TransactionService {
  list: (
    query: ListTransactionsQuery,
    actor: TransactionActor,
  ) => Promise<{ items: TransactionDto[]; meta: PaginationMeta }>
}

export const createTransactionService = ({
  transactionRepository,
}: {
  transactionRepository: TransactionRepository
}): TransactionService => ({
  list: async (query, actor) => {
    const range =
      query.start_date !== undefined || query.end_date !== undefined
        ? resolveDateRange({ start_date: query.start_date, end_date: query.end_date })
        : null

    const { items, total } = await transactionRepository.list({
      skip: toSkip(query.page, query.limit),
      take: query.limit,
      status: query.status,
      cashierId: actor.canReadAll ? undefined : actor.userId,
      startAt: range?.startAt,
      endAt: range?.endAt,
    })

    return {
      items: items.map(toTransactionDto),
      meta: buildPaginationMeta(query.page, query.limit, total),
    }
  },
})