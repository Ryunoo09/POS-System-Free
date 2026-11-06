<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import TransactionTable from '@/components/transactions/TransactionTable.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useTransactionsStore } from '@/stores/transactions.store'
import type { PaymentMethod, TransactionListParams, TransactionStatus } from '@/types/transaction'
import { DEFAULT_PAGE_SIZE, PAYMENT_METHODS } from '@/utils/constants'
import { rangeForPreset, validateRange } from '@/utils/date-range'
import { PERMISSIONS } from '@/utils/permissions'

interface Filters {
  start_date: string
  end_date: string
  cashier_id: string
  status: '' | TransactionStatus
  payment_method: '' | PaymentMethod
  search: string
}

const defaultFilters = (): Filters => ({
  ...rangeForPreset('last30'),
  cashier_id: '',
  status: '',
  payment_method: '',
  search: '',
})

const statusOptions: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: 'Semua status' },
  { value: 'COMPLETED', label: 'Selesai' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
]

const paymentOptions: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: 'Semua metode' },
  ...PAYMENT_METHODS.map((method) => ({ value: method.value, label: method.label })),
]

const auth = useAuthStore()
const store = useTransactionsStore()
const router = useRouter()

const filters = ref<Filters>(defaultFilters())
const page = ref(1)
const dateError = ref('')
const canFilterCashier = computed(() => auth.hasPermission(PERMISSIONS.TRANSACTION_READ_ALL))

const cashierOptions = computed<ReadonlyArray<{ value: string; label: string }>>(() => [
  { value: '', label: 'Semua kasir' },
  ...store.cashiers.map((cashier) => ({ value: cashier.id, label: cashier.name })),
])

const buildParams = (): TransactionListParams | null => {
  const { start_date, end_date, cashier_id, status, payment_method, search } = filters.value

  if (Boolean(start_date) !== Boolean(end_date)) {
    dateError.value = 'Isi tanggal awal dan akhir'
    return null
  }

  if (start_date && end_date) {
    const message = validateRange({ start_date, end_date })
    if (message) {
      dateError.value = message
      return null
    }
  }

  dateError.value = ''

  const params: TransactionListParams = { page: page.value, limit: DEFAULT_PAGE_SIZE }
  if (start_date) params.start_date = start_date
  if (end_date) params.end_date = end_date
  if (cashier_id) params.cashier_id = cashier_id
  if (status) params.status = status
  if (payment_method) params.payment_method = payment_method
  if (search.trim()) params.search = search.trim()
  return params
}

const load = (): void => {
  const params = buildParams()
  if (params) void store.fetchList(params)
}

const applyFilters = (): void => {
  if (page.value !== 1) page.value = 1
  else load()
}

const resetFilters = (): void => {
  filters.value = defaultFilters()
  dateError.value = ''

  if (page.value !== 1) page.value = 1
  else load()
}

const openDetail = (id: string): void => {
  void router.push(`/transactions/${id}`)
}

watch(page, load)

onMounted(() => {
  if (canFilterCashier.value) void store.fetchCashiers()
  load()
})
</script>

<template>
  <section class="space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Riwayat Transaksi</h1>
        <p class="mt-1 text-sm text-slate-500">Cari dan telusuri transaksi yang sudah tercatat.</p>
      </div>
      <AppBadge v-if="!canFilterCashier" tone="neutral">Hanya transaksi Anda</AppBadge>
    </header>

    <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AppInput
          v-model="filters.start_date"
          label="Dari tanggal"
          type="date"
          :max="filters.end_date"
        />
        <AppInput
          v-model="filters.end_date"
          label="Sampai tanggal"
          type="date"
          :min="filters.start_date"
        />
        <AppSelect
          v-if="canFilterCashier"
          v-model="filters.cashier_id"
          label="Kasir"
          :options="cashierOptions"
          :disabled="store.cashiersLoading"
        />
        <AppSelect v-model="filters.status" label="Status" :options="statusOptions" />
        <AppSelect v-model="filters.payment_method" label="Metode" :options="paymentOptions" />
        <AppInput
          v-model="filters.search"
          label="Cari invoice"
          placeholder="Nomor invoice"
          inputmode="search"
          class="sm:col-span-2"
          @keydown.enter.prevent="applyFilters"
        />
      </div>

      <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p class="text-xs text-rose-600">{{ dateError }}</p>
        <div class="ml-auto flex gap-2">
          <AppButton variant="secondary" size="sm" @click="resetFilters">Reset</AppButton>
          <AppButton size="sm" @click="applyFilters">Terapkan</AppButton>
        </div>
      </div>
    </div>

    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      <div v-if="store.isLoading" class="space-y-3 p-4">
        <SkeletonBlock v-for="index in 5" :key="index" height="2.25rem" />
      </div>

      <ErrorState v-else-if="store.error" :message="store.error" @retry="load" />

      <EmptyState
        v-else-if="store.items.length === 0"
        title="Tidak ada transaksi untuk filter ini"
        description="Ubah filter atau rentang tanggal untuk melihat transaksi lain."
      />

      <template v-else>
        <TransactionTable :items="store.items" @open="openDetail" />
        <PaginationBar :meta="store.meta" @change="page = $event" />
      </template>
    </div>
  </section>
</template>
