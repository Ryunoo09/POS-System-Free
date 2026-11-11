<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppSelect from '@/components/common/AppSelect.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import SegmentedControl from '@/components/common/SegmentedControl.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import DateRangeFilter from '@/components/dashboard/DateRangeFilter.vue'
import SummaryCard from '@/components/dashboard/SummaryCard.vue'
import WidgetCard from '@/components/dashboard/WidgetCard.vue'
import CashierReportTable from '@/components/reports/CashierReportTable.vue'
import ProductReportTable from '@/components/reports/ProductReportTable.vue'
import SalesReportTable from '@/components/reports/SalesReportTable.vue'
import ShiftReportTable from '@/components/reports/ShiftReportTable.vue'
import ValuationReportTable from '@/components/reports/ValuationReportTable.vue'
import { useCategoriesStore } from '@/stores/categories.store'
import { useReportsStore } from '@/stores/reports.store'
import { useShiftStore } from '@/stores/shift.store'
import type { DateRange } from '@/types/dashboard'
import type { ProductReportSort, SalesGroupBy } from '@/types/report'
import { rangeForPreset } from '@/utils/date-range'
import { formatNumber, formatRupiah } from '@/utils/format'

type Tab = 'sales' | 'products' | 'valuation' | 'cashiers' | 'shifts'

const store = useReportsStore()
const categoriesStore = useCategoriesStore()
const shiftStore = useShiftStore()

const range = ref<DateRange>(rangeForPreset('last30'))
const tab = ref<Tab>('sales')
const groupBy = ref<SalesGroupBy>('daily')
const sort = ref<ProductReportSort>('best_selling')
const categoryId = ref('')
const page = ref(1)
const limit = 10

const categories = ref<Array<{ value: string; label: string }>>([
  { value: '', label: 'Semua Kategori' },
])

const tabs = [
  { value: 'sales', label: 'Penjualan' },
  { value: 'products', label: 'Per Produk' },
  { value: 'valuation', label: 'Valuasi' },
  { value: 'cashiers', label: 'Per Kasir' },
  { value: 'shifts', label: 'Shift Kasir' },
] as const

const groupOptions = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
]

const sortOptions = [
  { value: 'best_selling', label: 'Terlaris' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'profit', label: 'Profit' },
]

const summaryLoading = computed(
  () =>
    store.summary === null &&
    (store.salesLoading || store.productsLoading || store.cashiersLoading),
)

const loadSales = (): void => {
  void store.loadSales({ ...range.value, group_by: groupBy.value })
}

const loadProducts = (): void => {
  void store.loadProducts({
    ...range.value,
    category_id: categoryId.value || undefined,
    sort: sort.value,
    page: page.value,
    limit,
  })
}

const loadCashiers = (): void => {
  void store.loadCashiers(range.value)
}

const loadValuation = (): void => {
  void store.loadValuation({})
}

const loadShifts = (): void => {
  void shiftStore.fetchHistory()
}

const loadAll = (): void => {
  void Promise.all([loadSales(), loadProducts(), loadCashiers(), loadValuation(), loadShifts()])
}

const loadCategories = async (): Promise<void> => {
  await categoriesStore.fetchCategoryOptions()
  categories.value = [
    { value: '', label: 'Semua Kategori' },
    ...categoriesStore.options.map((category) => ({ value: category.id, label: category.name })),
  ]
}

onMounted(() => {
  void loadCategories()
  loadAll()
})

const changeRange = (value: DateRange): void => {
  range.value = value
  page.value = 1
  loadAll()
}

const changeTab = (value: string): void => {
  tab.value = value as Tab
}

watch(groupBy, loadSales)

watch(sort, () => {
  page.value = 1
  loadProducts()
})

watch(categoryId, () => {
  page.value = 1
  loadProducts()
})

const changePage = (value: number): void => {
  page.value = value
  loadProducts()
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 class="text-[28px] font-semibold tracking-tight text-ink">Laporan</h1>
        <p class="mt-1 text-sm text-ink-3">Laporan penjualan, produk, dan performa kasir.</p>
      </div>

      <DateRangeFilter :model-value="range" @update:model-value="changeRange" />
    </div>

    <div v-if="summaryLoading" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SkeletonBlock v-for="index in 4" :key="index" height="6.25rem" rounded="lg" />
    </div>

    <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        label="Revenue"
        :value="formatRupiah(store.summary?.revenue ?? 0)"
        hint="Sebelum pajak"
      />
      <SummaryCard
        label="COGS"
        :value="formatRupiah(store.summary?.cogs ?? 0)"
        hint="Harga modal barang terjual"
      />
      <SummaryCard
        label="Estimasi Gross Profit"
        :value="formatRupiah(store.summary?.gross_profit ?? 0)"
        hint="Revenue − COGS"
      />
      <SummaryCard
        label="Transaksi"
        :value="formatNumber(store.summary?.transaction_count ?? 0)"
        hint="Transaksi selesai"
      />
    </div>

    <p class="text-xs text-ink-3">
      Revenue sebelum pajak. Estimasi gross profit = revenue − COGS, belum termasuk biaya
      operasional.
    </p>

    <div class="flex flex-wrap items-end justify-between gap-3">
      <SegmentedControl
        :model-value="tab"
        :options="tabs"
        label="Jenis laporan"
        @update:model-value="changeTab"
      />

      <div v-if="tab === 'sales'" class="w-40">
        <AppSelect v-model="groupBy" label="Kelompok" :options="groupOptions" />
      </div>

      <div v-else-if="tab === 'products'" class="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div class="sm:w-40">
          <AppSelect v-model="sort" label="Urutkan" :options="sortOptions" />
        </div>
        <div class="sm:w-52">
          <AppSelect v-model="categoryId" label="Kategori" :options="categories" />
        </div>
      </div>
    </div>

    <WidgetCard
      v-if="tab === 'sales'"
      title="Laporan Penjualan"
      :loading="store.salesLoading"
      :error="store.salesError"
      :empty="store.sales.length === 0"
      :skeleton-rows="5"
      @retry="loadSales"
    >
      <SalesReportTable :items="store.sales" />
    </WidgetCard>

    <WidgetCard
      v-else-if="tab === 'products'"
      title="Laporan Per Produk"
      :loading="store.productsLoading"
      :error="store.productsError"
      :empty="store.products.length === 0"
      :skeleton-rows="5"
      @retry="loadProducts"
    >
      <ProductReportTable :items="store.products" />
      <PaginationBar :meta="store.productsMeta" @change="changePage" />
    </WidgetCard>

    <WidgetCard
      v-else-if="tab === 'valuation'"
      title="Valuasi Inventaris"
      :loading="store.valuationLoading"
      :error="store.valuationError"
      :empty="false"
      :skeleton-rows="5"
      @retry="loadValuation"
    >
      <div class="space-y-5">
        <div class="grid gap-3 sm:grid-cols-2">
          <SummaryCard
            label="Total Nilai Stok"
            :value="formatRupiah(store.valuation?.total_value ?? 0)"
            hint="Σ stok × biaya rata-rata"
          />
          <SummaryCard
            label="Total Kuantitas"
            :value="formatNumber(store.valuation?.total_quantity ?? 0)"
            hint="Unit tercatat"
          />
        </div>

        <div v-if="(store.valuation?.by_category.length ?? 0) > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-ink-3">
                <th scope="col" class="px-4 py-3 font-medium">Kategori</th>
                <th scope="col" class="px-4 py-3 text-right font-medium">Qty</th>
                <th scope="col" class="px-4 py-3 text-right font-medium">Nilai</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="row in store.valuation?.by_category ?? []"
                :key="row.category_id ?? 'none'"
                class="hover:bg-surface-2"
              >
                <td class="px-4 py-3 font-medium text-ink">{{ row.category }}</td>
                <td class="px-4 py-3 text-right tabular-nums text-ink-2">
                  {{ formatNumber(row.quantity) }}
                </td>
                <td class="px-4 py-3 text-right tabular-nums font-semibold text-ink">
                  {{ formatRupiah(row.value) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <ValuationReportTable :items="store.valuation?.items ?? []" />
        <p
          v-if="(store.valuation?.items.length ?? 0) === 0"
          class="text-sm text-ink-3"
        >
          Belum ada produk dengan stok untuk dinilai.
        </p>
      </div>
    </WidgetCard>

    <WidgetCard
      v-else-if="tab === 'cashiers'"
      title="Laporan Per Kasir"
      :loading="store.cashiersLoading"
      :error="store.cashiersError"
      :empty="store.cashiers.length === 0"
      :skeleton-rows="5"
      @retry="loadCashiers"
    >
      <CashierReportTable :items="store.cashiers" />
    </WidgetCard>

    <WidgetCard
      v-else-if="tab === 'shifts'"
      title="Laporan & Rekonsiliasi Shift Kasir"
      :loading="shiftStore.isLoading"
      :error="shiftStore.error || undefined"
      :empty="shiftStore.history.length === 0"
      :skeleton-rows="5"
      @retry="loadShifts"
    >
      <ShiftReportTable :items="shiftStore.history" :loading="shiftStore.isLoading" />
    </WidgetCard>
  </div>
</template>
