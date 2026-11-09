<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import ReturnReceiptView from '@/components/returns/ReturnReceiptView.vue'
import { useReturnsStore } from '@/stores/returns.store'
import type { ReturnListParams, ReturnRecord, ReturnStatus } from '@/types/return'
import { DEFAULT_PAGE_SIZE } from '@/utils/constants'
import { rangeForPreset, validateRange } from '@/utils/date-range'
import { formatDateTime, formatRupiah } from '@/utils/format'
import { paymentMethodLabel } from '@/utils/transactions'

interface Filters {
  start_date: string
  end_date: string
  status: '' | ReturnStatus
}

const statusOptions: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: 'Semua status' },
  { value: 'COMPLETED', label: 'Selesai' },
  { value: 'PENDING', label: 'Menunggu' },
  { value: 'APPROVED', label: 'Disetujui' },
  { value: 'REJECTED', label: 'Ditolak' },
]

const statusLabels: Record<ReturnStatus, string> = {
  PENDING: 'Menunggu',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  COMPLETED: 'Selesai',
}

const statusTones: Record<ReturnStatus, 'success' | 'danger' | 'warning' | 'neutral'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  COMPLETED: 'success',
}

const defaultFilters = (): Filters => ({
  ...rangeForPreset('last30'),
  status: '',
})

const store = useReturnsStore()

const filters = ref<Filters>(defaultFilters())
const page = ref(1)
const dateError = ref('')
const selected = ref<ReturnRecord | null>(null)

const buildParams = (): ReturnListParams | null => {
  const { start_date, end_date, status } = filters.value

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

  const params: ReturnListParams = { page: page.value, limit: DEFAULT_PAGE_SIZE }
  if (start_date) params.start_date = start_date
  if (end_date) params.end_date = end_date
  if (status) params.status = status
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

const openDetail = (record: ReturnRecord): void => {
  selected.value = record
}

const printReceipt = (): void => {
  window.print()
}

watch(page, load)

onMounted(load)
</script>

<template>
  <section class="space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-[28px] font-semibold tracking-tight text-ink">Riwayat Retur</h1>
        <p class="mt-1 text-sm text-ink-3">Daftar retur penjualan beserta refund dan bukti retur.</p>
      </div>
    </header>

    <div class="rounded-xl border border-border bg-surface p-4">
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
        <AppSelect v-model="filters.status" label="Status" :options="statusOptions" />
      </div>

      <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p class="text-xs text-negative">{{ dateError }}</p>
        <div class="ml-auto flex gap-2">
          <AppButton variant="secondary" size="sm" @click="resetFilters">Reset</AppButton>
          <AppButton size="sm" @click="applyFilters">Terapkan</AppButton>
        </div>
      </div>
    </div>

    <div class="overflow-hidden rounded-xl border border-border bg-surface">
      <div v-if="store.isLoading" class="space-y-3 p-4">
        <SkeletonBlock v-for="index in 5" :key="index" height="2.25rem" />
      </div>

      <ErrorState v-else-if="store.error" :message="store.error" @retry="load" />

      <EmptyState
        v-else-if="store.items.length === 0"
        title="Belum ada retur untuk filter ini"
        description="Ubah filter atau rentang tanggal untuk melihat retur lain."
      />

      <template v-else>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-ink-3">
                <th scope="col" class="px-4 py-3 font-medium">No. Retur</th>
                <th scope="col" class="px-4 py-3 font-medium">Invoice</th>
                <th scope="col" class="px-4 py-3 font-medium">Kasir</th>
                <th scope="col" class="px-4 py-3 text-right font-medium">Item</th>
                <th scope="col" class="px-4 py-3 text-right font-medium">Refund</th>
                <th scope="col" class="px-4 py-3 font-medium">Metode</th>
                <th scope="col" class="px-4 py-3 font-medium">Status</th>
                <th scope="col" class="px-4 py-3 font-medium">Waktu</th>
                <th scope="col" class="px-4 py-3 text-right font-medium">Detail</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-border">
              <tr v-for="record in store.items" :key="record.id" class="hover:bg-surface-2">
                <td class="whitespace-nowrap px-4 py-3 font-medium text-ink">
                  {{ record.return_number }}
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-ink-2">
                  {{ record.transaction.invoice_number }}
                </td>
                <td class="px-4 py-3 text-ink-2">{{ record.cashier.name }}</td>
                <td class="px-4 py-3 text-right text-ink-2">{{ record.items.length }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-right font-medium text-ink">
                  {{ formatRupiah(record.refund_amount) }}
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-ink-2">
                  {{ paymentMethodLabel(record.refund_method) }}
                </td>
                <td class="px-4 py-3">
                  <AppBadge :tone="statusTones[record.status]">
                    {{ statusLabels[record.status] ?? record.status }}
                  </AppBadge>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-ink-2">
                  {{ formatDateTime(record.created_at) }}
                </td>
                <td class="px-4 py-3 text-right">
                  <AppButton variant="ghost" size="sm" @click="openDetail(record)">Lihat</AppButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <PaginationBar :meta="store.meta" @change="page = $event" />
      </template>
    </div>

    <AppModal
      :open="Boolean(selected)"
      title="Bukti Retur"
      max-width="md"
      @close="selected = null"
    >
      <ReturnReceiptView v-if="selected" :record="selected" />

      <template #footer>
        <AppButton variant="secondary" @click="selected = null">Tutup</AppButton>
        <AppButton @click="printReceipt">Cetak Bukti</AppButton>
      </template>
    </AppModal>
  </section>
</template>