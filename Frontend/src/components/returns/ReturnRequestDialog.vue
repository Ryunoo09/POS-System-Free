<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import AppTextarea from '@/components/common/AppTextarea.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import type { PaymentMethod, TransactionDetail, TransactionItem } from '@/types/transaction'
import type {
  ReturnAction,
  ReturnCreatePayload,
  ReturnRecord,
} from '@/types/return'
import { PAYMENT_METHODS } from '@/utils/constants'
import { formatRupiah } from '@/utils/format'

const props = defineProps<{
  open: boolean
  transaction: TransactionDetail
  existingReturns: ReturnRecord[]
  loadingExisting: boolean
  isSaving: boolean
  serverError: string
}>()

const emit = defineEmits<{ close: []; submit: [payload: ReturnCreatePayload] }>()

interface RowState {
  checked: boolean
  quantity: number
  action: ReturnAction
}

interface RowView {
  item: TransactionItem
  remaining: number
  checked: boolean
  quantity: number
  action: ReturnAction
}

const rows = ref<Record<string, RowState>>({})
const refundMethod = ref<string>('CASH')
const reason = ref('')
const formError = ref('')

const actionOptions = [
  { value: 'RESTOCK', label: 'Kembalikan ke stok' },
  { value: 'DAMAGED', label: 'Rusak / tidak kembali ke stok' },
]

const returnedByItem = computed<Record<string, number>>(() => {
  const totals: Record<string, number> = {}

  for (const record of props.existingReturns) {
    for (const item of record.items) {
      totals[item.transaction_item_id] = (totals[item.transaction_item_id] ?? 0) + item.quantity
    }
  }

  return totals
})

const rowViews = computed<RowView[]>(() =>
  props.transaction.items.map((item) => {
    const state = rows.value[item.id] ?? { checked: false, quantity: 1, action: 'RESTOCK' }
    const returned = returnedByItem.value[item.id] ?? 0

    return {
      item,
      remaining: Math.max(0, item.quantity - returned),
      ...state,
    }
  }),
)

const availableRows = computed(() => rowViews.value.filter((row) => row.remaining > 0))

const selectedRows = computed(() =>
  rowViews.value.filter((row) => row.checked && row.remaining > 0),
)

const refundEstimate = computed(() => {
  let minor = 0

  for (const row of selectedRows.value) {
    const quantity = Math.min(row.quantity, row.remaining)
    const lineMinor = Math.round(Number(row.item.subtotal) * 100)
    minor += Math.round((lineMinor * quantity) / row.item.quantity)
  }

  return minor / 100
})

const errorText = computed(() => formError.value || props.serverError)

const updateRow = (id: string, patch: Partial<RowState>): void => {
  const current = rows.value[id] ?? { checked: false, quantity: 1, action: 'RESTOCK' }
  rows.value = { ...rows.value, [id]: { ...current, ...patch } }
}

const toggleRow = (row: RowView, event: Event): void => {
  updateRow(row.item.id, { checked: (event.target as HTMLInputElement).checked })
}

const changeQuantity = (row: RowView, event: Event): void => {
  const parsed = Number((event.target as HTMLInputElement).value)
  const quantity = Number.isFinite(parsed)
    ? Math.min(row.remaining, Math.max(1, Math.trunc(parsed)))
    : 1

  updateRow(row.item.id, { quantity, checked: true })
}

const changeAction = (row: RowView, event: Event): void => {
  updateRow(row.item.id, { action: (event.target as HTMLSelectElement).value as ReturnAction })
}

watch(
  () => props.open,
  (open) => {
    if (!open) return

    formError.value = ''
    reason.value = ''
    refundMethod.value = props.transaction.payment_method
    rows.value = Object.fromEntries(
      props.transaction.items.map((item) => [
        item.id,
        { checked: false, quantity: 1, action: 'RESTOCK' as ReturnAction },
      ]),
    )
  },
)

const submit = (): void => {
  formError.value = ''

  if (selectedRows.value.length === 0) {
    formError.value = 'Pilih minimal satu item untuk diretur.'
    return
  }

  const trimmedReason = reason.value.trim()

  if (trimmedReason.length < 3) {
    formError.value = 'Alasan retur minimal 3 karakter.'
    return
  }

  emit('submit', {
    transaction_id: props.transaction.id,
    reason: trimmedReason,
    refund_method: refundMethod.value as PaymentMethod,
    items: selectedRows.value.map((row) => ({
      transaction_item_id: row.item.id,
      quantity: Math.min(row.quantity, row.remaining),
      action: row.action,
    })),
  })
}
</script>

<template>
  <AppModal :open="open" title="Ajukan Retur" max-width="lg" @close="emit('close')">
    <div class="space-y-4">
      <div class="rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink-2">
        Invoice <span class="font-medium text-ink">{{ transaction.invoice_number }}</span>
        <span class="mx-1 text-ink-3">·</span>
        {{ transaction.items.length }} item
      </div>

      <div v-if="loadingExisting" class="space-y-2">
        <SkeletonBlock v-for="index in 3" :key="index" height="2.25rem" />
      </div>

      <p v-else-if="availableRows.length === 0" class="text-sm text-ink-3">
        Semua item pada transaksi ini sudah diretur.
      </p>

      <div v-else class="overflow-x-auto rounded-lg border border-border">
        <table class="min-w-full divide-y divide-border text-sm">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wide text-ink-3">
              <th scope="col" class="px-3 py-2 font-medium">Pilih</th>
              <th scope="col" class="px-3 py-2 font-medium">Produk</th>
              <th scope="col" class="px-3 py-2 font-medium">Dibeli</th>
              <th scope="col" class="px-3 py-2 font-medium">Sisa</th>
              <th scope="col" class="px-3 py-2 font-medium">Retur</th>
              <th scope="col" class="px-3 py-2 font-medium">Aksi</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-border">
            <tr v-for="row in availableRows" :key="row.item.id">
              <td class="px-3 py-2">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-border text-accent focus:ring-accent/40"
                  :checked="row.checked"
                  :aria-label="`Pilih ${row.item.product_name}`"
                  @change="toggleRow(row, $event)"
                />
              </td>
              <td class="px-3 py-2">
                <p class="font-medium text-ink">{{ row.item.product_name }}</p>
                <p class="text-xs text-ink-3">{{ row.item.product_sku }}</p>
              </td>
              <td class="whitespace-nowrap px-3 py-2 text-ink-2">{{ row.item.quantity }}</td>
              <td class="whitespace-nowrap px-3 py-2 text-ink-2">{{ row.remaining }}</td>
              <td class="px-3 py-2">
                <input
                  type="number"
                  min="1"
                  :max="row.remaining"
                  :value="row.quantity"
                  class="h-9 w-20 rounded-lg border border-border bg-surface px-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  :aria-label="`Kuantitas retur ${row.item.product_name}`"
                  @input="changeQuantity(row, $event)"
                />
              </td>
              <td class="px-3 py-2">
                <select
                  :value="row.action"
                  class="h-9 w-full min-w-40 rounded-lg border border-border bg-surface px-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  :aria-label="`Aksi retur ${row.item.product_name}`"
                  @change="changeAction(row, $event)"
                >
                  <option v-for="option in actionOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <AppSelect v-model="refundMethod" label="Metode Refund" :options="PAYMENT_METHODS" />
        <div class="flex items-end">
          <div class="w-full rounded-lg bg-accent-soft px-3 py-2 text-sm">
            <p class="text-xs text-accent-ink/80">Estimasi refund</p>
            <p class="text-base font-semibold text-accent-ink">{{ formatRupiah(refundEstimate) }}</p>
          </div>
        </div>
      </div>

      <AppTextarea
        v-model="reason"
        label="Alasan Retur"
        placeholder="Contoh: produk rusak saat diterima"
        :rows="2"
        :maxlength="255"
        required
      />

      <p v-if="errorText" class="rounded-lg bg-negative-soft px-3 py-2 text-sm text-negative">
        {{ errorText }}
      </p>
    </div>

    <template #footer>
      <AppButton variant="secondary" :disabled="isSaving" @click="emit('close')">Batal</AppButton>
      <AppButton
        variant="accent"
        :loading="isSaving"
        :disabled="availableRows.length === 0"
        @click="submit"
      >
        Proses Retur
      </AppButton>
    </template>
  </AppModal>
</template>