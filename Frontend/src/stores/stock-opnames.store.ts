import { ref } from 'vue'
import { defineStore } from 'pinia'
import { stockOpnamesService } from '@/services/stock-opnames.service'
import type { PaginationMeta } from '@/types/api'
import type {
  StockOpnameCreatePayload,
  StockOpnameDetail,
  StockOpnameListItem,
  StockOpnameListParams,
  StockOpnameUpdateItemPayload,
} from '@/types/stock-opname'
import { errorMessage } from '@/utils/errors'
import { emptyPaginationMeta } from '@/utils/pagination'

export const useStockOpnamesStore = defineStore('stock-opnames', () => {
  const items = ref<StockOpnameListItem[]>([])
  const meta = ref<PaginationMeta>(emptyPaginationMeta())
  const detail = ref<StockOpnameDetail | null>(null)
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref('')

  const fetchList = async (params: StockOpnameListParams): Promise<void> => {
    isLoading.value = true
    error.value = ''

    try {
      const result = await stockOpnamesService.list(params)
      items.value = result.items
      meta.value = result.meta
    } catch (err) {
      error.value = errorMessage(err, 'Gagal memuat sesi opname.')
    } finally {
      isLoading.value = false
    }
  }

  const fetchDetail = async (id: string): Promise<void> => {
    isLoading.value = true
    error.value = ''

    try {
      detail.value = await stockOpnamesService.get(id)
    } catch (err) {
      error.value = errorMessage(err, 'Gagal memuat detail opname.')
    } finally {
      isLoading.value = false
    }
  }

  const run = async <T>(action: () => Promise<T>): Promise<T> => {
    isSaving.value = true

    try {
      return await action()
    } finally {
      isSaving.value = false
    }
  }

  const create = async (payload: StockOpnameCreatePayload): Promise<StockOpnameDetail> =>
    run(async () => {
      detail.value = await stockOpnamesService.create(payload)
      return detail.value
    })

  const start = async (id: string): Promise<void> => {
    detail.value = await run(() => stockOpnamesService.start(id))
  }

  const recount = (): void => {
    const current = detail.value
    if (!current) return

    let counted = 0
    let positive = 0
    let negative = 0
    let zero = 0
    let adjustment = 0

    for (const row of current.items) {
      if (row.physical_stock === null || row.difference === null) continue

      counted += 1
      adjustment += row.difference
      if (row.difference > 0) positive += 1
      else if (row.difference < 0) negative += 1
      else zero += 1
    }

    current.total_items = current.items.length
    current.counted_items = counted
    current.uncounted_items = current.items.length - counted
    current.positive_differences = positive
    current.negative_differences = negative
    current.zero_differences = zero
    current.total_adjustment_quantity = adjustment
  }

  const updateItem = async (
    id: string,
    itemId: string,
    payload: StockOpnameUpdateItemPayload,
  ): Promise<void> => {
    const item = await run(() => stockOpnamesService.updateItem(id, itemId, payload))

    if (detail.value) {
      const index = detail.value.items.findIndex((row) => row.id === item.id)
      if (index >= 0) detail.value.items[index] = item
      recount()
    }
  }

  const submit = async (id: string): Promise<void> => {
    detail.value = await run(() => stockOpnamesService.submit(id))
  }

  const approve = async (id: string): Promise<void> => {
    detail.value = await run(() => stockOpnamesService.approve(id))
  }

  const reject = async (id: string, reason: string): Promise<void> => {
    detail.value = await run(() => stockOpnamesService.reject(id, reason))
  }

  const complete = async (id: string): Promise<void> => {
    detail.value = await run(() => stockOpnamesService.complete(id))
  }

  const cancel = async (id: string): Promise<void> => {
    detail.value = await run(() => stockOpnamesService.cancel(id))
  }

  return {
    items,
    meta,
    detail,
    isLoading,
    isSaving,
    error,
    fetchList,
    fetchDetail,
    create,
    start,
    updateItem,
    submit,
    approve,
    reject,
    complete,
    cancel,
  }
})