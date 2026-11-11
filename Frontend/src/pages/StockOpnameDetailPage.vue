<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import OpnameStatusBadge from '@/components/stock-opname/OpnameStatusBadge.vue'
import { useNotification } from '@/composables/useNotification'
import { useAuthStore } from '@/stores/auth.store'
import { useStockOpnamesStore } from '@/stores/stock-opnames.store'
import type { StockOpnameItem, StockOpnameScope } from '@/types/stock-opname'
import { errorMessage } from '@/utils/errors'
import { formatDateTime, formatNumber } from '@/utils/format'
import { PERMISSIONS } from '@/utils/permissions'

const scopeLabels: Record<StockOpnameScope, string> = {
  ALL: 'Semua produk',
  CATEGORY: 'Kategori',
  PRODUCT: 'Produk tertentu',
}

const route = useRoute()
const notify = useNotification()
const auth = useAuthStore()
const store = useStockOpnamesStore()

const sessionId = computed(() => String(route.params.id ?? ''))
const session = computed(() => store.detail)
const canManage = computed(() => auth.hasPermission(PERMISSIONS.STOCK_OPNAME_MANAGE))
const canCount = computed(() => canManage.value && session.value?.status === 'IN_PROGRESS')
const canStart = computed(() => canManage.value && session.value?.status === 'DRAFT')
const canSubmit = computed(() => canManage.value && session.value?.status === 'IN_PROGRESS')

const edits = ref<Record<string, { physical: string; reason: string }>>({})
const savingItemId = ref('')
const highlightId = ref('')
const scanCode = ref('')
const rowRefs = new Map<string, HTMLInputElement>()

const setRowRef = (id: string, el: unknown): void => {
  if (el instanceof HTMLInputElement) rowRefs.set(id, el)
  else rowRefs.delete(id)
}

const rowEdit = (id: string): { physical: string; reason: string } =>
  edits.value[id] ?? { physical: '', reason: '' }

const updateEdit = (id: string, field: 'physical' | 'reason', value: string): void => {
  edits.value[id] = { ...rowEdit(id), [field]: value }
}

watch(
  session,
  (detail) => {
    if (!detail) return

    const next: Record<string, { physical: string; reason: string }> = {}
    for (const item of detail.items) {
      next[item.id] = {
        physical: item.physical_stock === null ? '' : String(item.physical_stock),
        reason: item.reason ?? '',
      }
    }
    edits.value = next
  },
  { immediate: true },
)

const load = (): void => {
  if (sessionId.value) void store.fetchDetail(sessionId.value)
}

const saveItem = async (item: StockOpnameItem): Promise<void> => {
  const edit = edits.value[item.id]
  if (!edit || !canCount.value) return

  const raw = edit.physical.trim()
  if (raw === '') return

  const value = Number(raw)

  if (!Number.isInteger(value) || value < 0) {
    notify.error('Stok fisik harus bilangan bulat dan tidak negatif')
    edit.physical = item.physical_stock === null ? '' : String(item.physical_stock)
    return
  }

  const reason = edit.reason.trim()
  if (value === item.physical_stock && reason === (item.reason ?? '')) return

  savingItemId.value = item.id

  try {
    await store.updateItem(sessionId.value, item.id, {
      physical_stock: value,
      ...(reason ? { reason } : {}),
    })
  } catch (error) {
    notify.error(errorMessage(error, 'Gagal menyimpan hitungan.'))
  } finally {
    savingItemId.value = ''
  }
}

const scan = async (): Promise<void> => {
  const code = scanCode.value.trim()
  if (!code) return

  const detail = session.value
  const match = detail?.items.find((item) => item.barcode === code || item.sku === code)

  scanCode.value = ''

  if (!match) {
    notify.error(`Barcode/SKU "${code}" tidak ada pada sesi ini.`)
    return
  }

  highlightId.value = match.id
  await nextTick()
  rowRefs.get(match.id)?.focus()
}

const start = async (): Promise<void> => {
  try {
    await store.start(sessionId.value)
    notify.success('Sesi opname dimulai')
  } catch (error) {
    notify.error(errorMessage(error, 'Gagal memulai sesi.'))
  }
}

const submit = async (): Promise<void> => {
  try {
    await store.submit(sessionId.value)
    notify.success('Sesi dikirim untuk approval')
  } catch (error) {
    notify.error(errorMessage(error, 'Gagal mengirim sesi.'))
  }
}

onMounted(load)
</script>

<template>
  <section class="space-y-6">
    <div>
      <RouterLink to="/stock-opnames" class="text-sm text-ink-3 hover:text-ink">
        ← Kembali ke daftar
      </RouterLink>
    </div>

    <div v-if="store.isLoading && !session" class="space-y-3">
      <SkeletonBlock height="3rem" />
      <SkeletonBlock height="6rem" />
      <SkeletonBlock height="12rem" />
    </div>

    <ErrorState v-else-if="store.error && !session" :message="store.error" @retry="load" />

    <template v-else-if="session">
      <header class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-[28px] font-semibold tracking-tight text-ink">{{ session.name }}</h1>
            <OpnameStatusBadge :status="session.status" />
          </div>
          <p class="mt-1 text-sm text-ink-3">
            {{ session.session_number }} · {{ scopeLabels[session.scope] }} · dibuat
            {{ session.created_by.name }} pada {{ formatDateTime(session.created_at) }}
          </p>
          <p v-if="session.notes" class="mt-2 text-sm text-ink-2">{{ session.notes }}</p>
        </div>

        <div class="flex flex-wrap gap-2">
          <AppButton v-if="canStart" :loading="store.isSaving" @click="start">Mulai Hitung</AppButton>
          <AppButton
            v-if="canSubmit"
            :loading="store.isSaving"
            :disabled="session.counted_items === 0"
            @click="submit"
          >
            Kirim Approval
          </AppButton>
        </div>
      </header>

      <p
        v-if="session.rejection_reason"
        class="rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning"
      >
        Ditolak: {{ session.rejection_reason }}
      </p>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-xl border border-border bg-surface p-4">
          <p class="text-xs uppercase tracking-wide text-ink-3">Progres</p>
          <p class="mt-1 text-lg font-semibold text-ink">
            {{ session.counted_items }} / {{ session.total_items }}
          </p>
        </div>
        <div class="rounded-xl border border-border bg-surface p-4">
          <p class="text-xs uppercase tracking-wide text-ink-3">Selisih lebih</p>
          <p class="mt-1 text-lg font-semibold text-accent">{{ session.positive_differences }}</p>
        </div>
        <div class="rounded-xl border border-border bg-surface p-4">
          <p class="text-xs uppercase tracking-wide text-ink-3">Selisih kurang</p>
          <p class="mt-1 text-lg font-semibold text-negative">{{ session.negative_differences }}</p>
        </div>
        <div class="rounded-xl border border-border bg-surface p-4">
          <p class="text-xs uppercase tracking-wide text-ink-3">Total penyesuaian</p>
          <p class="mt-1 text-lg font-semibold text-ink">
            {{ formatNumber(session.total_adjustment_quantity) }}
          </p>
        </div>
      </div>

      <div v-if="canCount" class="rounded-xl border border-border bg-surface p-4">
        <AppInput
          v-model="scanCode"
          label="Scan barcode / SKU"
          placeholder="Scan atau ketik lalu Enter"
          @keydown.enter="scan"
        />
      </div>

      <div class="overflow-hidden rounded-xl border border-border bg-surface">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-ink-3">
                <th scope="col" class="px-4 py-3 font-medium">Produk</th>
                <th scope="col" class="px-4 py-3 font-medium">Sistem</th>
                <th scope="col" class="px-4 py-3 font-medium">Fisik</th>
                <th scope="col" class="px-4 py-3 font-medium">Selisih</th>
                <th scope="col" class="hidden px-4 py-3 font-medium md:table-cell">Alasan</th>
                <th scope="col" class="hidden px-4 py-3 font-medium lg:table-cell">
                  Dihitung oleh
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="item in session.items"
                :key="item.id"
                :class="
                  highlightId === item.id ? 'bg-accent-soft' : 'hover:bg-surface-2'
                "
              >
                <td class="px-4 py-3">
                  <p class="font-medium text-ink">{{ item.name }}</p>
                  <p class="text-xs text-ink-3">{{ item.sku }}</p>
                </td>
                <td class="px-4 py-3 text-ink-2">{{ formatNumber(item.system_stock) }}</td>
                <td class="px-4 py-3">
                  <input
                    v-if="canCount"
                    :ref="(el) => setRowRef(item.id, el)"
                    :value="rowEdit(item.id).physical"
                    type="number"
                    min="0"
                    step="1"
                    inputmode="numeric"
                    :disabled="savingItemId === item.id"
                    class="h-9 w-24 rounded-lg border border-border bg-surface px-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:bg-surface-2"
                    @input="updateEdit(item.id, 'physical', ($event.target as HTMLInputElement).value)"
                    @keydown.enter="saveItem(item)"
                    @blur="saveItem(item)"
                  />
                  <span v-else-if="item.physical_stock === null" class="text-ink-3">—</span>
                  <span v-else class="text-ink-2">{{ formatNumber(item.physical_stock) }}</span>
                </td>
                <td class="px-4 py-3">
                  <span
                    v-if="item.difference !== null"
                    :class="
                      item.difference === 0
                        ? 'text-ink-2'
                        : item.difference > 0
                          ? 'text-accent'
                          : 'text-negative'
                    "
                  >
                    {{ item.difference > 0 ? '+' : '' }}{{ formatNumber(item.difference) }}
                  </span>
                  <span v-else class="text-ink-3">—</span>
                </td>
                <td class="hidden px-4 py-3 md:table-cell">
                  <input
                    v-if="canCount"
                    :value="rowEdit(item.id).reason"
                    type="text"
                    :disabled="savingItemId === item.id"
                    placeholder="Opsional"
                    class="h-9 w-full min-w-40 rounded-lg border border-border bg-surface px-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:bg-surface-2"
                    @input="updateEdit(item.id, 'reason', ($event.target as HTMLInputElement).value)"
                    @keydown.enter="saveItem(item)"
                    @blur="saveItem(item)"
                  />
                  <span v-else class="text-ink-2">{{ item.reason ?? '—' }}</span>
                </td>
                <td class="hidden px-4 py-3 text-ink-2 lg:table-cell">
                  <template v-if="item.counted_by">
                    <p>{{ item.counted_by.name }}</p>
                    <p class="text-xs text-ink-3">{{ formatDateTime(item.counted_at ?? '') }}</p>
                  </template>
                  <span v-else>—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </section>
</template>