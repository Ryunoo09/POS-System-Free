import { runInTransaction } from '../config/database.js'
import { BusinessRuleError, NotFoundError } from '../errors/app-errors.js'
import {
  toPriceHistoryDto,
  toScheduledPriceDto,
  type PriceHistoryDto,
  type ScheduledPriceDto,
} from '../mappers/price.mapper.js'
import type { PriceRepository, PriceTx } from '../repositories/price.repository.js'
import type { ProductRepository, ProductView } from '../repositories/product.repository.js'
import { fromMinor, toMinor } from '../utils/pricing.js'

const HISTORY_LIMIT = 100
const BULK_LIMIT = 500

export type PriceSource = 'MANUAL' | 'SCHEDULED' | 'BULK'
export type PriceMode = 'SET' | 'PERCENT' | 'NOMINAL'

export interface PriceActor {
  id: string
  canViewCostPrice: boolean
}

export interface PriceChangeInput {
  productId: string
  before: { sellingPrice: string; costPrice: string }
  after: { sellingPrice: string; costPrice: string }
  source: PriceSource
  reason: string | null
  changedById: string | null
  tx?: PriceTx
}

export interface SchedulePriceInput {
  selling_price: number
  effective_date: Date
  reason: string
}

export interface BulkPriceInput {
  mode: PriceMode
  value: number
  product_ids?: string[] | undefined
  category_id?: string | undefined
}

export interface BulkPriceItem {
  id: string
  name: string
  sku: string
  old_price: string
  new_price: string
}

export interface PriceService {
  recordPriceChanges: (input: PriceChangeInput) => Promise<void>
  listHistory: (productId: string, actor: PriceActor) => Promise<PriceHistoryDto[]>
  applyDueScheduledPrices: (
    tx?: PriceTx,
    productIds?: string[],
  ) => Promise<number>
  schedulePrice: (
    productId: string,
    input: SchedulePriceInput,
    actor: PriceActor,
  ) => Promise<ScheduledPriceDto>
  getScheduledPrice: (productId: string) => Promise<ScheduledPriceDto | null>
  cancelScheduledPrice: (productId: string, scheduleId: string) => Promise<void>
  bulkPreview: (input: BulkPriceInput) => Promise<BulkPriceItem[]>
  bulkApply: (
    input: BulkPriceInput & { reason: string },
    actor: PriceActor,
  ) => Promise<{ updated: number }>
}

const nextPrice = (current: string, input: BulkPriceInput): string => {
  const currentMinor = toMinor(current)
  const next =
    input.mode === 'SET'
      ? Math.round(input.value * 100)
      : input.mode === 'PERCENT'
        ? Math.round(currentMinor * (1 + input.value / 100))
        : currentMinor + Math.round(input.value * 100)

  if (next < 0) {
    throw new BusinessRuleError('Harga hasil update tidak boleh negatif', 'NEGATIVE_PRICE')
  }

  return fromMinor(next)
}

export const createPriceService = ({
  priceRepository,
  productRepository,
}: {
  priceRepository: PriceRepository
  productRepository: ProductRepository
}): PriceService => {
  const assertProduct = async (productId: string): Promise<void> => {
    if (!(await productRepository.findById(productId))) {
      throw new NotFoundError('Produk tidak ditemukan', 'NOT_FOUND')
    }
  }

  const resolveProducts = async (input: BulkPriceInput): Promise<ProductView[]> => {
    if (input.product_ids) {
      const products = await productRepository.findManyByIds(input.product_ids)

      if (products.length !== new Set(input.product_ids).size) {
        throw new NotFoundError('Sebagian produk tidak ditemukan', 'NOT_FOUND')
      }

      return products
    }

    if (!input.category_id) {
      throw new BusinessRuleError(
        'Pilih produk atau kategori',
        'INVALID_BULK_TARGET',
        [{ field: 'product_ids', message: 'Pilih produk atau kategori' }],
      )
    }

    const { items, total } = await productRepository.list({
      skip: 0,
      take: BULK_LIMIT,
      categoryId: input.category_id,
      isActive: true,
    })

    if (total > BULK_LIMIT) {
      throw new BusinessRuleError(
        `Maksimal ${BULK_LIMIT} produk per update massal`,
        'BULK_LIMIT_EXCEEDED',
      )
    }

    return items
  }

  const applyDue = async (
    now: Date,
    tx: PriceTx,
    productIds?: string[],
  ): Promise<number> => {
    const due = await priceRepository.findDueSchedules(now, productIds, tx)
    let applied = 0

    for (const schedule of due) {
      if ((await priceRepository.claimSchedule(schedule.id, now, tx)) === 0) continue

      const product = await productRepository.findByIdForUpdate(schedule.productId, tx)
      if (!product) continue

      const oldValue = product.sellingPrice.toFixed(2)
      const newValue = schedule.sellingPrice.toFixed(2)
      if (oldValue === newValue) continue

      await productRepository.update(product.id, { sellingPrice: newValue }, tx)
      await priceRepository.createHistory(
        {
          productId: product.id,
          field: 'SELLING_PRICE',
          oldValue,
          newValue,
          source: 'SCHEDULED',
          reason: schedule.reason,
          changedById: schedule.createdById,
        },
        tx,
      )
      applied += 1
    }

    return applied
  }

  return {
    recordPriceChanges: async (input) => {
      const rows: Array<{
        field: 'SELLING_PRICE' | 'COST_PRICE'
        oldValue: string
        newValue: string
      }> = []

      if (toMinor(input.before.sellingPrice) !== toMinor(input.after.sellingPrice)) {
        rows.push({
          field: 'SELLING_PRICE',
          oldValue: input.before.sellingPrice,
          newValue: input.after.sellingPrice,
        })
      }

      if (toMinor(input.before.costPrice) !== toMinor(input.after.costPrice)) {
        rows.push({
          field: 'COST_PRICE',
          oldValue: input.before.costPrice,
          newValue: input.after.costPrice,
        })
      }

      for (const row of rows) {
        await priceRepository.createHistory(
          {
            productId: input.productId,
            field: row.field,
            oldValue: row.oldValue,
            newValue: row.newValue,
            source: input.source,
            reason: input.reason,
            changedById: input.changedById,
          },
          input.tx,
        )
      }
    },

    listHistory: async (productId, actor) => {
      await assertProduct(productId)
      const rows = await priceRepository.listHistory(productId, HISTORY_LIMIT)

      return rows
        .filter((row) => actor.canViewCostPrice || row.field !== 'COST_PRICE')
        .map(toPriceHistoryDto)
    },

    applyDueScheduledPrices: (tx, productIds) => {
      const now = new Date()

      return tx
        ? applyDue(now, tx, productIds)
        : runInTransaction((client) => applyDue(now, client, productIds))
    },

    schedulePrice: async (productId, input, actor) => {
      await assertProduct(productId)

      if (input.effective_date.getTime() <= Date.now()) {
        throw new BusinessRuleError(
          'Tanggal berlaku harus di masa depan',
          'INVALID_EFFECTIVE_DATE',
          [{ field: 'effective_date', message: 'Tanggal berlaku harus di masa depan' }],
        )
      }

      const created = await runInTransaction(async (tx) => {
        await priceRepository.cancelActiveSchedules(productId, tx)

        return priceRepository.createSchedule(
          {
            productId,
            sellingPrice: input.selling_price.toFixed(2),
            effectiveDate: input.effective_date,
            reason: input.reason,
            createdById: actor.id,
          },
          tx,
        )
      })

      return toScheduledPriceDto(created)
    },

    getScheduledPrice: async (productId) => {
      await assertProduct(productId)
      const schedule = await priceRepository.findActiveSchedule(productId)

      return schedule ? toScheduledPriceDto(schedule) : null
    },

    cancelScheduledPrice: async (productId, scheduleId) => {
      const cancelled = await priceRepository.cancelSchedule(scheduleId, productId)

      if (cancelled === 0) {
        throw new NotFoundError('Jadwal harga tidak ditemukan', 'NOT_FOUND')
      }
    },

    bulkPreview: async (input) => {
      const products = await resolveProducts(input)

      return products.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        old_price: product.sellingPrice.toFixed(2),
        new_price: nextPrice(product.sellingPrice.toFixed(2), input),
      }))
    },

    bulkApply: async (input, actor) => {
      const products = await resolveProducts(input)

      return runInTransaction(async (tx) => {
        const locked = await productRepository.findManyByIdsForUpdate(
          products.map((product) => product.id),
          tx,
        )
        let updated = 0

        for (const product of locked) {
          const oldValue = product.sellingPrice.toFixed(2)
          const newValue = nextPrice(oldValue, input)
          if (oldValue === newValue) continue

          await productRepository.update(product.id, { sellingPrice: newValue }, tx)
          await priceRepository.createHistory(
            {
              productId: product.id,
              field: 'SELLING_PRICE',
              oldValue,
              newValue,
              source: 'BULK',
              reason: input.reason,
              changedById: actor.id,
            },
            tx,
          )
          updated += 1
        }

        return { updated }
      })
    },
  }
}
