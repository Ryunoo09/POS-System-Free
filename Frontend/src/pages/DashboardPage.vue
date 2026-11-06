<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ErrorState from '@/components/common/ErrorState.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import CategoryBars from '@/components/dashboard/CategoryBars.vue'
import DateRangeFilter from '@/components/dashboard/DateRangeFilter.vue'
import KpiStrip from '@/components/dashboard/KpiStrip.vue'
import LowStockList from '@/components/dashboard/LowStockList.vue'
import PaymentMixChart from '@/components/dashboard/PaymentMixChart.vue'
import RecentTransactions from '@/components/dashboard/RecentTransactions.vue'
import SalesChart from '@/components/dashboard/SalesChart.vue'
import TopProductsList from '@/components/dashboard/TopProductsList.vue'
import WidgetCard from '@/components/dashboard/WidgetCard.vue'
import { useDashboardStore } from '@/stores/dashboard.store'
import type { DateRange } from '@/types/dashboard'
import { rangeForPreset } from '@/utils/date-range'
import { formatNumber, formatRupiah } from '@/utils/format'

const store = useDashboardStore()
const range = ref<DateRange>(rangeForPreset('last7'))

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

const reloadBreakdown = (): void => {
  void store.loadBreakdown(range.value)
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

const kpis = computed(() => {
  const summary = store.summary

  return [
    {
      label: 'Penjualan',
      value: formatRupiah(summary?.revenue ?? 0),
      hint: 'Sebelum pajak',
      delta: summary
        ? { current: Number(summary.revenue), previous: Number(summary.previous.revenue) }
        : undefined,
    },
    {
      label: 'Transaksi',
      value: formatNumber(summary?.transaction_count ?? 0),
      hint: 'Selesai',
      delta: summary
        ? {
            current: summary.transaction_count,
            previous: summary.previous.transaction_count,
          }
        : undefined,
    },
    {
      label: 'Estimasi Profit',
      value: formatRupiah(summary?.gross_profit ?? 0),
      hint: 'Setelah COGS',
      delta: summary
        ? {
            current: Number(summary.gross_profit),
            previous: Number(summary.previous.gross_profit),
          }
        : undefined,
    },
    {
      label: 'Produk',
      value: formatNumber(summary?.total_products ?? 0),
      hint: 'Aktif',
      delta: undefined,
    },
    {
      label: 'Stok',
      value: formatNumber(summary?.total_stock ?? 0),
      hint: `${formatNumber(summary?.low_stock_count ?? 0)} stok rendah`,
      delta: undefined,
    },
  ]
})

const insight = computed(() => {
  const summary = store.summary
  if (!summary) return ''

  const previous = Number(summary.previous.revenue)
  const current = Number(summary.revenue)

  if (previous === 0) {
    return current === 0 ? 'Belum ada penjualan pada periode ini.' : 'Penjualan baru tercatat.'
  }

  const percent = Math.round(((current - previous) / previous) * 100)
  if (percent === 0) return 'Penjualan sama dengan periode sebelumnya.'

  return `Penjualan ${percent > 0 ? 'naik' : 'turun'} ${Math.abs(percent)}% dibanding periode sebelumnya.`
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 class="text-[28px] font-semibold leading-tight tracking-tight text-ink">Dashboard</h1>
        <p class="mt-1 text-sm text-ink-2">Ringkasan performa toko pada periode terpilih.</p>
      </div>

      <DateRangeFilter :model-value="range" @update:model-value="changeRange" />
    </div>

    <div v-if="store.summaryLoading" class="grid grid-cols-2 gap-3 xl:grid-cols-5">
      <SkeletonBlock
        v-for="index in 5"
        :key="index"
        height="5.5rem"
        rounded="lg"
        :class="index === 5 ? 'col-span-2 xl:col-span-1' : ''"
      />
    </div>

    <ErrorState v-else-if="store.summaryError" :message="store.summaryError" @retry="reloadSummary" />

    <KpiStrip v-else :items="kpis" />

    <div class="grid gap-4 lg:grid-cols-3">
      <div class="min-w-0 lg:col-span-2">
        <WidgetCard
          title="Grafik Penjualan"
          :subtitle="insight"
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
        title="Metode Pembayaran"
        subtitle="Porsi omzet per metode"
        :loading="store.breakdownLoading"
        :error="store.breakdownError"
        :empty="(store.breakdown?.payment_methods.length ?? 0) === 0"
        @retry="reloadBreakdown"
      >
        <PaymentMixChart :items="store.breakdown?.payment_methods ?? []" />
      </WidgetCard>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <WidgetCard
        title="Penjualan per Kategori"
        subtitle="Kontribusi omzet"
        :loading="store.breakdownLoading"
        :error="store.breakdownError"
        :empty="(store.breakdown?.categories.length ?? 0) === 0"
        @retry="reloadBreakdown"
      >
        <CategoryBars :items="store.breakdown?.categories ?? []" />
      </WidgetCard>

      <WidgetCard
        title="Produk Terlaris"
        subtitle="Berdasarkan jumlah terjual"
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
        subtitle="Perlu segera diisi ulang"
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
        subtitle="Aktivitas terakhir di toko"
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