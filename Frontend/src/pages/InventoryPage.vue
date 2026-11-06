<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppBadge from '@/components/common/AppBadge.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import AdjustmentModal, {
  type AdjustmentValues,
} from '@/components/inventory/AdjustmentModal.vue'
import MovementTable from '@/components/inventory/MovementTable.vue'
import StockTable from '@/components/inventory/StockTable.vue'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import { useNotification } from '@/composables/useNotification'
import { useAuthStore } from '@/stores/auth.store'
import { useCategoriesStore } from '@/stores/categories.store'
import { useInventoryStore } from '@/stores/inventory.store'
import { useProductsStore } from '@/stores/products.store'
import type {
  AdjustMovementType,
  AdjustStockPayload,
  InventoryListParams,
  MovementListParams,
  StockMovementType,
} from '@/types/inventory'
import type { Product } from '@/types/product'
import { DEFAULT_PAGE_SIZE } from '@/utils/constants'
import { validateRange } from '@/utils/date-range'
import { errorFieldErrors, errorMessage } from '@/utils/errors'
import { PERMISSIONS } from '@/utils/permissions'

type Tab = 'stock' | 'low' | 'history'
type Option = { value: string; label: string }

const tabs: ReadonlyArray<{ value: Tab; label: string }> = [
  { value: 'stock', label: 'Stok' },
  { value: 'low', label: 'Stok Rendah' },
  { value: 'history', label: 'Riwayat' },
]

const movementTypeOptions: ReadonlyArray<Option> = [
  { value: '', label: 'Semua tipe' },
  { value: 'PURCHASE', label: 'Pembelian' },
  { value: 'ADJUSTMENT', label: 'Penyesuaian' },
  { value: 'SALE', label: 'Penjualan' },
  { value: 'INITIAL_STOCK', label: 'Stok Awal' },
  { value: 'RETURN', label: 'Retur' },
]

const auth = useAuthStore()
const categories = useCategoriesStore()
const products = useProductsStore()
const store = useInventoryStore()
const notify = useNotification()
const route = useRoute()

const canAdjust = computed(() => auth.hasPermission(PERMISSIONS.INVENTORY_ADJUST))

const tab = ref<Tab>('stock')
const initialSearch = typeof route.query.search === 'string' ? route.query.search : ''

const stockFilters = ref({ search: initialSearch, category_id: '' })
const stockSearch = useDebouncedRef(computed(() => stockFilters.value.search))
const stockPage = ref(1)

const lowPage = ref(1)

const historyFilters = ref({
  product_id: '',
  movement_type: '',
  start_date: '',
  end_date: '',
})
const historyPage = ref(1)
const historyDateError = ref('')

const categoryOptions = computed<Option[]>(() => [
  { value: '', label: 'Semua kategori' },
  ...categories.options.map((category) => ({ value: category.id, label: category.name })),
])

const historyProductOptions = computed<Option[]>(() => [
  { value: '', label: 'Semua produk' },
  ...products.options.map((product) => ({
    value: product.id,
    label: `${product.name} (${product.sku})`,
  })),
])

const stockParams = (): InventoryListParams => {
  const params: InventoryListParams = { page: stockPage.value, limit: DEFAULT_PAGE_SIZE }
  const search = stockSearch.value.trim()
  if (search) params.search = search
  if (stockFilters.value.category_id) params.category_id = stockFilters.value.category_id
  return params
}

const loadStock = (): void => {
  void store.fetchStock(stockParams())
}

const loadLowStock = (): void => {
  void store.fetchLowStock({ page: lowPage.value, limit: DEFAULT_PAGE_SIZE })
}

const historyParams = (): MovementListParams | null => {
  const { product_id, movement_type, start_date, end_date } = historyFilters.value

  if (Boolean(start_date) !== Boolean(end_date)) {
    historyDateError.value = 'Isi tanggal awal dan akhir'
    return null
  }

  if (start_date && end_date) {
    const message = validateRange({ start_date, end_date })
    if (message) {
      historyDateError.value = message
      return null
    }
  }

  historyDateError.value = ''

  const params: MovementListParams = { page: historyPage.value, limit: DEFAULT_PAGE_SIZE }
  if (product_id) params.product_id = product_id
  if (movement_type) params.movement_type = movement_type as StockMovementType
  if (start_date) params.start_date = start_date
  if (end_date) params.end_date = end_date
  return params
}

const loadHistory = (): void => {
  const params = historyParams()
  if (params) void store.fetchMovements(params)
}

const selectTab = (value: Tab): void => {
  tab.value = value
  if (value === 'stock') loadStock()
  else if (value === 'low') loadLowStock()
  else loadHistory()
}

const setStockSearch = (value: string | number): void => {
  stockFilters.value.search = String(value)
}

const setHistoryDate = (field: 'start_date' | 'end_date', value: string | number): void => {
  historyFilters.value[field] = String(value)
}

watch([stockSearch, () => stockFilters.value.category_id], () => {
  if (stockPage.value !== 1) stockPage.value = 1
  else loadStock()
})
watch(stockPage, loadStock)
watch(lowPage, loadLowStock)
watch(
  () => [
    historyFilters.value.product_id,
    historyFilters.value.movement_type,
    historyFilters.value.start_date,
    historyFilters.value.end_date,
  ],
  () => {
    if (historyPage.value !== 1) historyPage.value = 1
    else loadHistory()
  },
)
watch(historyPage, loadHistory)

const adjustmentOpen = ref(false)
const adjustmentProduct = ref<Product | null>(null)
const adjustmentType = ref<AdjustMovementType>('PURCHASE')
const adjustmentFieldErrors = ref<Record<string, string>>({})
const adjustmentError = ref('')
const pendingReduction = ref<AdjustmentValues | null>(null)

const openAdjustment = (product: Product, type: AdjustMovementType): void => {
  adjustmentProduct.value = product
  adjustmentType.value = type
  adjustmentFieldErrors.value = {}
  adjustmentError.value = ''
  adjustmentOpen.value = true
}

const closeAdjustment = (): void => {
  adjustmentOpen.value = false
  adjustmentProduct.value = null
  pendingReduction.value = null
}

const refreshAfterAdjustment = async (): Promise<void> => {
  await store.fetchStock(stockParams())
  await store.fetchLowStock({ page: lowPage.value, limit: DEFAULT_PAGE_SIZE })

  if (tab.value === 'history') {
    const params = historyParams()
    if (params) await store.fetchMovements(params)
  }
}

const runAdjustment = async (values: AdjustmentValues): Promise<void> => {
  const product = adjustmentProduct.value
  if (!product) return

  const payload: AdjustStockPayload = {
    product_id: product.id,
    movement_type: adjustmentType.value,
    quantity: values.quantity,
  }
  if (values.notes) payload.notes = values.notes

  try {
    await store.adjust(payload)
    notify.success(
      adjustmentType.value === 'PURCHASE' ? 'Stok berhasil ditambah' : 'Stok berhasil disesuaikan',
    )
    closeAdjustment()
    await refreshAfterAdjustment()
  } catch (error) {
    const fields = errorFieldErrors(error)
    adjustmentFieldErrors.value = fields
    adjustmentError.value = Object.keys(fields).length
      ? ''
      : errorMessage(error, 'Gagal menyesuaikan stok.')
  }
}

const submitAdjustment = (values: AdjustmentValues): void => {
  adjustmentFieldErrors.value = {}
  adjustmentError.value = ''

  if (adjustmentType.value === 'ADJUSTMENT' && values.quantity < 0) {
    pendingReduction.value = values
    return
  }

  void runAdjustment(values)
}

const confirmReduction = (): void => {
  const values = pendingReduction.value
  pendingReduction.value = null
  if (values) void runAdjustment(values)
}

const reductionMessage = computed(() => {
  const product = adjustmentProduct.value
  const values = pendingReduction.value
  if (!product || !values) return ''

  return `Stok "${product.name}" akan berkurang ${Math.abs(values.quantity)} dari ${
    product.stock
  } menjadi ${product.stock + values.quantity}. Lanjutkan?`
})

onMounted(() => {
  void categories.fetchCategoryOptions()
  void products.fetchProductOptions()
  loadStock()
  loadLowStock()
})
</script>

<template>
  <section class="space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Inventori</h1>
        <p class="mt-1 text-sm text-slate-500">
          Pantau stok, stok rendah, dan riwayat pergerakan stok.
        </p>
      </div>
      <AppBadge v-if="!canAdjust" tone="neutral">Hanya lihat</AppBadge>
    </header>

    <div class="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-card" role="tablist">
      <button
        v-for="item in tabs"
        :key="item.value"
        type="button"
        role="tab"
        :aria-selected="tab === item.value"
        :class="[
          'rounded-md px-3 py-1.5 text-sm font-medium transition',
          tab === item.value
            ? 'bg-slate-900 text-white'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        ]"
        @click="selectTab(item.value)"
      >
        {{ item.label }}
        <span
          v-if="item.value === 'low' && store.lowStockMeta.total_items > 0"
          class="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-700"
        >
          {{ store.lowStockMeta.total_items }}
        </span>
      </button>
    </div>

    <div v-if="tab === 'stock'" class="space-y-4">
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]">
          <AppInput
            :model-value="stockFilters.search"
            label="Cari produk"
            placeholder="Nama atau SKU"
            @update:model-value="setStockSearch"
          />
          <AppSelect v-model="stockFilters.category_id" label="Kategori" :options="categoryOptions" />
        </div>
      </div>

      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div v-if="store.stockLoading" class="space-y-3 p-4">
          <SkeletonBlock v-for="index in 5" :key="index" height="2.25rem" />
        </div>

        <ErrorState v-else-if="store.stockError" :message="store.stockError" @retry="loadStock" />

        <EmptyState
          v-else-if="store.stockItems.length === 0"
          title="Belum ada produk"
          description="Tambahkan produk terlebih dahulu agar stoknya dapat dipantau."
        />

        <template v-else>
          <StockTable
            :items="store.stockItems"
            :can-adjust="canAdjust"
            show-value
            @adjust="openAdjustment"
          />
          <PaginationBar :meta="store.stockMeta" @change="stockPage = $event" />
        </template>
      </div>
    </div>

    <div v-else-if="tab === 'low'" class="space-y-4">
      <p class="text-sm text-slate-500">
        Produk aktif dengan stok sama dengan atau di bawah batas minimum.
      </p>

      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div v-if="store.lowStockLoading" class="space-y-3 p-4">
          <SkeletonBlock v-for="index in 5" :key="index" height="2.25rem" />
        </div>

        <ErrorState
          v-else-if="store.lowStockError"
          :message="store.lowStockError"
          @retry="loadLowStock"
        />

        <EmptyState
          v-else-if="store.lowStockItems.length === 0"
          title="Tidak ada stok rendah"
          description="Semua produk berada di atas batas minimum stok."
        />

        <template v-else>
          <StockTable
            :items="store.lowStockItems"
            :can-adjust="canAdjust"
            @adjust="openAdjustment"
          />
          <PaginationBar :meta="store.lowStockMeta" @change="lowPage = $event" />
        </template>
      </div>
    </div>

    <div v-else class="space-y-4">
      <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AppSelect
            v-model="historyFilters.product_id"
            label="Produk"
            :options="historyProductOptions"
          />
          <AppSelect
            v-model="historyFilters.movement_type"
            label="Tipe pergerakan"
            :options="movementTypeOptions"
          />
          <AppInput
            :model-value="historyFilters.start_date"
            label="Dari tanggal"
            type="date"
            :max="historyFilters.end_date"
            @update:model-value="setHistoryDate('start_date', $event)"
          />
          <AppInput
            :model-value="historyFilters.end_date"
            label="Sampai tanggal"
            type="date"
            :min="historyFilters.start_date"
            @update:model-value="setHistoryDate('end_date', $event)"
          />
        </div>
        <p v-if="historyDateError" class="mt-2 text-xs text-rose-600">{{ historyDateError }}</p>
      </div>

      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div v-if="store.movementLoading" class="space-y-3 p-4">
          <SkeletonBlock v-for="index in 5" :key="index" height="2.25rem" />
        </div>

        <ErrorState
          v-else-if="store.movementError"
          :message="store.movementError"
          @retry="loadHistory"
        />

        <EmptyState
          v-else-if="store.movementItems.length === 0"
          title="Belum ada riwayat"
          description="Pergerakan stok akan muncul di sini setelah ada transaksi atau penyesuaian."
        />

        <template v-else>
          <MovementTable :items="store.movementItems" />
          <PaginationBar :meta="store.movementMeta" @change="historyPage = $event" />
        </template>
      </div>
    </div>

    <AdjustmentModal
      :open="adjustmentOpen"
      :product="adjustmentProduct"
      :movement-type="adjustmentType"
      :loading="store.isSaving"
      :field-errors="adjustmentFieldErrors"
      :form-error="adjustmentError"
      @close="closeAdjustment"
      @submit="submitAdjustment"
    />

    <ConfirmDialog
      :open="Boolean(pendingReduction)"
      title="Kurangi stok?"
      :message="reductionMessage"
      confirm-label="Ya, kurangi"
      variant="danger"
      :loading="store.isSaving"
      @confirm="confirmReduction"
      @cancel="pendingReduction = null"
    />
  </section>
</template>