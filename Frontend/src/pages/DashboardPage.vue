<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ErrorState from '@/components/common/ErrorState.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import DateRangeFilter from '@/components/dashboard/DateRangeFilter.vue'
import LowStockList from '@/components/dashboard/LowStockList.vue'
import RecentTransactions from '@/components/dashboard/RecentTransactions.vue'
import SalesChart from '@/components/dashboard/SalesChart.vue'
import SummaryCard from '@/components/dashboard/SummaryCard.vue'
import TopProductsList from '@/components/dashboard/TopProductsList.vue'
import WidgetCard from '@/components/dashboard/WidgetCard.vue'
import { useDashboardStore } from '@/stores/dashboard.store'
import type { DateRange } from '@/types/dashboard'
import { rangeForPreset } from '@/utils/date-range'
import { formatNumber, formatRupiah } from '@/utils/format'

const store = useDashboardStore()
const range = ref<DateRange>(rangeForPreset('today'))

const load = (): void => {
  void store.loadAll(range.value)
}

onMounted(load)

const changeRange = (value: DateRange): void => {
  range.value = value
  load()
}

const reloadSummary = (): void => {
  void store.loadSummary(range.value)
}

const reloadSales = (): void => {
  void store.loadSales(range.value)
}

const reloadTopProducts = (): void => {
  void store.loadTopProducts(range.value)
}

const reloadLowStock = (): void => {
  void store.loadLowStock()
}

const reloadRecentTransactions = (): void => {
  void store.loadRecentTransactions(range.value)
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p class="mt-1 text-sm text-slate-500">Ringkasan performa toko pada periode terpilih.</p>
      </div>

      <DateRangeFilter :model-value="range" @update:model-value="changeRange" />
    </div>

    <div v-if="store.summaryLoading" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <SkeletonBlock v-for="index in 5" :key="index" height="6.25rem" rounded="lg" />
    </div>

    <ErrorState v-else-if="store.summaryError" :message="store.summaryError" @retry="reloadSummary" />

    <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <SummaryCard
        label="Penjualan"
        :value="formatRupiah(store.summary?.revenue ?? 0)"
        hint="Revenue sebelum pajak"
      />
      <SummaryCard
        label="Transaksi"
        :value="formatNumber(store.summary?.transaction_count ?? 0)"
        hint="Transaksi selesai"
      />
      <SummaryCard
        label="Estimasi Profit"
        :value="formatRupiah(store.summary?.gross_profit ?? 0)"
        hint="Revenue dikurangi COGS"
      />
      <SummaryCard
        label="Produk"
        :value="formatNumber(store.summary?.total_products ?? 0)"
        hint="Produk aktif"
      />
      <SummaryCard
        label="Stok"
        :value="formatNumber(store.summary?.total_stock ?? 0)"
        :hint="`${formatNumber(store.summary?.low_stock_count ?? 0)} stok rendah`"
      />
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <div class="lg:col-span-2">
        <WidgetCard
          title="Grafik Penjualan"
          :loading="store.salesLoading"
          :error="store.salesError"
          :empty="store.sales.length === 0"
          :skeleton-rows="6"
          @retry="reloadSales"
        >
          <SalesChart :data="store.sales" />
        </WidgetCard>
      </div>

      <WidgetCard
        title="Produk Terlaris"
        :loading="store.topProductsLoading"
        :error="store.topProductsError"
        :empty="store.topProducts.length === 0"
        @retry="reloadTopProducts"
      >
        <TopProductsList :items="store.topProducts" />
      </WidgetCard>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <WidgetCard
        title="Stok Rendah"
        :loading="store.lowStockLoading"
        :error="store.lowStockError"
        :empty="store.lowStock.length === 0"
        empty-message="Semua stok berada di atas batas minimum."
        @retry="reloadLowStock"
      >
        <LowStockList :items="store.lowStock" />
      </WidgetCard>

      <WidgetCard
        title="Transaksi Terbaru"
        :loading="store.recentTransactionsLoading"
        :error="store.recentTransactionsError"
        :empty="store.recentTransactions.length === 0"
        @retry="reloadRecentTransactions"
      >
        <RecentTransactions :items="store.recentTransactions" />
      </WidgetCard>
    </div>
  </div>
</template>