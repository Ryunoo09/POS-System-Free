<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import OpnameStatusBadge from '@/components/stock-opname/OpnameStatusBadge.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useStockOpnamesStore } from '@/stores/stock-opnames.store'
import type { StockOpnameListParams, StockOpnameScope, StockOpnameStatus } from '@/types/stock-opname'
import { DEFAULT_PAGE_SIZE } from '@/utils/constants'
import { validateRange } from '@/utils/date-range'
import { formatDateTime } from '@/utils/format'
import { PERMISSIONS } from '@/utils/permissions'

type Option = { value: string; label: string }

const statusOptions: ReadonlyArray<Option> = [
  { value: '', label: 'Semua status' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_PROGRESS', label: 'Berjalan' },
  { value: 'SUBMITTED', label: 'Menunggu Approval' },
  { value: 'APPROVED', label: 'Disetujui' },
  { value: 'COMPLETED', label: 'Selesai' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
]

const scopeOptions: ReadonlyArray<Option> = [
  { value: '', label: 'Semua cakupan' },
  { value: 'ALL', label: 'Semua produk' },
  { value: 'CATEGORY', label: 'Kategori' },
  { value: 'PRODUCT', label: 'Produk tertentu' },
]

const scopeLabels: Record<StockOpnameScope, string> = {
  ALL: 'Semua produk',
  CATEGORY: 'Kategori',
  PRODUCT: 'Produk tertentu',
}

const auth = useAuthStore()
const store = useStockOpnamesStore()
const router = useRouter()

const canManage = computed(() => auth.hasPermission(PERMISSIONS.STOCK_OPNAME_MANAGE))

const filters = ref({ status: '', scope: '', start_date: '', end_date: '' })
const page = ref(1)
const dateError = ref('')

const setFilter = (field: 'start_date' | 'end_date', value: string | number): void => {
  filters.value[field] = String(value)
}

const params = (): StockOpnameListParams | null => {
  const { status, scope, start_date, end_date } = filters.value

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

  const result: StockOpnameListParams = { page: page.value, limit: DEFAULT_PAGE_SIZE }
  if (status) result.status = status as StockOpnameStatus
  if (scope) result.scope = scope as StockOpnameScope
  if (start_date) result.start_date = start_date
  if (end_date) result.end_date = end_date
  return result
}

const load = (): void => {
  const query = params()
  if (query) void store.fetchList(query)
}

watch(
  () => [filters.value.status, filters.value.scope, filters.value.start_date, filters.value.end_date],
  () => {
    if (page.value !== 1) page.value = 1
    else load()
  },
)
watch(page, load)

onMounted(load)
</script>

<template>
  <section class="space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-[28px] font-semibold tracking-tight text-ink">Stok Opname</h1>
        <p class="mt-1 text-sm text-ink-3">
          Bandingkan stok fisik dengan stok sistem dan setujui penyesuaiannya.
        </p>
      </div>
      <AppButton v-if="canManage" @click="router.push('/stock-opnames/new')">Sesi Baru</AppButton>
    </header>

    <div class="rounded-xl border border-border bg-surface p-4">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AppSelect v-model="filters.status" label="Status" :options="statusOptions" />
        <AppSelect v-model="filters.scope" label="Cakupan" :options="scopeOptions" />
        <AppInput
          :model-value="filters.start_date"
          label="Dari tanggal"
          type="date"
          :max="filters.end_date"
          :error="dateError"
          @update:model-value="setFilter('start_date', $event)"
        />
        <AppInput
          :model-value="filters.end_date"
          label="Sampai tanggal"
          type="date"
          :min="filters.start_date"
          @update:model-value="setFilter('end_date', $event)"
        />
      </div>
    </div>

    <div class="overflow-hidden rounded-xl border border-border bg-surface">
      <div v-if="store.isLoading" class="space-y-3 p-4">
        <SkeletonBlock v-for="index in 5" :key="index" height="2.25rem" />
      </div>

      <ErrorState v-else-if="store.error" :message="store.error" @retry="load" />

      <EmptyState
        v-else-if="store.items.length === 0"
        title="Belum ada sesi opname"
        description="Buat sesi baru untuk mulai menghitung stok fisik."
      />

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-border text-sm">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wide text-ink-3">
              <th scope="col" class="px-4 py-3 font-medium">Sesi</th>
              <th scope="col" class="px-4 py-3 font-medium">Status</th>
              <th scope="col" class="hidden px-4 py-3 font-medium md:table-cell">Cakupan</th>
              <th scope="col" class="px-4 py-3 font-medium">Progres</th>
              <th scope="col" class="hidden px-4 py-3 font-medium lg:table-cell">Dibuat</th>
              <th scope="col" class="px-4 py-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="session in store.items" :key="session.id" class="hover:bg-surface-2">
              <td class="px-4 py-3">
                <p class="font-medium text-ink">{{ session.name }}</p>
                <p class="text-xs text-ink-3">{{ session.session_number }}</p>
              </td>
              <td class="px-4 py-3">
                <OpnameStatusBadge :status="session.status" />
              </td>
              <td class="hidden px-4 py-3 text-ink-2 md:table-cell">
                {{ scopeLabels[session.scope] }}
              </td>
              <td class="px-4 py-3 text-ink-2">
                {{ session.counted_items }} / {{ session.total_items }}
              </td>
              <td class="hidden px-4 py-3 text-ink-2 lg:table-cell">
                <p>{{ session.created_by.name }}</p>
                <p class="text-xs text-ink-3">{{ formatDateTime(session.created_at) }}</p>
              </td>
              <td class="px-4 py-3 text-right">
                <RouterLink
                  :to="`/stock-opnames/${session.id}`"
                  class="text-sm font-medium text-accent hover:underline"
                >
                  Lihat
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
        <PaginationBar :meta="store.meta" @change="page = $event" />
      </div>
    </div>
  </section>
</template>