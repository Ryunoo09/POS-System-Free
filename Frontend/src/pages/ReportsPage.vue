<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import DateRangeFilter from '@/components/dashboard/DateRangeFilter.vue'
import SummaryCard from '@/components/dashboard/SummaryCard.vue'
import WidgetCard from '@/components/dashboard/WidgetCard.vue'
import CashierReportTable from '@/components/reports/CashierReportTable.vue'
import ProductReportTable from '@/components/reports/ProductReportTable.vue'
import SalesReportTable from '@/components/reports/SalesReportTable.vue'
import { useCategoriesStore } from '@/stores/categories.store'
import { useReportsStore } from '@/stores/reports.store'
import type { DateRange } from '@/types/dashboard'
import type { ProductReportSort, SalesGroupBy } from '@/types/report'
import { rangeForPreset } from '@/utils/date-range'
import { formatNumber, formatRupiah } from '@/utils/format'

type Tab = 'sales' | 'products' | 'cashiers'

const store = useReportsStore()
const categoriesStore = useCategoriesStore()

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
  { value: 'cashiers', label: 'Per Kasir' },
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

const loadAll = (): void => {
  void Promise.all([loadSales(), loadProducts(), loadCashiers()])
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
        <h1 class="text-2xl font-semibold text-slate-900">Laporan</h1>
        <p class="mt-1 text-sm text-slate-500">Laporan penjualan, produk, dan performa kasir.</p>
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

    <p class="text-xs text-slate-500">
      Revenue sebelum pajak. Estimasi gross profit = revenue − COGS, belum termasuk biaya
      operasional.
    </p>

    <div class="flex flex-wrap items-end justify-between gap-3">
      <div class="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
        <AppButton
          v-for="item in tabs"
          :key="item.value"
          :variant="tab === item.value ? 'primary' : 'ghost'"
          size="sm"
          @click="tab = item.value"
        >
          {{ item.label }}
        </AppButton>
      </div>

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
      v-else
      title="Laporan Per Kasir"
      :loading="store.cashiersLoading"
      :error="store.cashiersError"
      :empty="store.cashiers.length === 0"
      :skeleton-rows="5"
      @retry="loadCashiers"
    >
      <CashierReportTable :items="store.cashiers" />
    </WidgetCard>
  </div>
</template>
