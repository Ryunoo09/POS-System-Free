<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppTextarea from '@/components/common/AppTextarea.vue'
import type { AdjustMovementType } from '@/types/inventory'
import type { Product } from '@/types/product'
import { formatNumber } from '@/utils/format'

export interface AdjustmentValues {
  quantity: number
  notes: string
}

const props = withDefaults(
  defineProps<{
    open: boolean
    product: Product | null
    movementType: AdjustMovementType
    loading?: boolean
    fieldErrors?: Record<string, string>
    formError?: string
  }>(),
  {
    loading: false,
    fieldErrors: () => ({}),
    formError: '',
  },
)

const emit = defineEmits<{
  close: []
  submit: [values: AdjustmentValues]
}>()

const quantity = ref<string | number>('')
const notes = ref('')

const isPurchase = computed(() => props.movementType === 'PURCHASE')
const title = computed(() => (isPurchase.value ? 'Tambah Stok' : 'Penyesuaian Stok'))

const quantityText = computed(() => String(quantity.value).trim())
const parsedQuantity = computed(() => Number(quantity.value))
const hasQuantity = computed(
  () => quantityText.value !== '' && Number.isFinite(parsedQuantity.value),
)

const stockAfter = computed(
  () => (props.product?.stock ?? 0) + (hasQuantity.value ? parsedQuantity.value : 0),
)

const quantityError = computed(() => {
  if (quantityText.value === '') return ''
  if (!Number.isInteger(parsedQuantity.value)) return 'Jumlah harus bilangan bulat'
  if (isPurchase.value && parsedQuantity.value <= 0) return 'Jumlah harus lebih dari 0'
  if (!isPurchase.value && parsedQuantity.value === 0) return 'Jumlah tidak boleh 0'
  return ''
})

const displayedQuantityError = computed(
  () => props.fieldErrors.quantity ?? quantityError.value,
)

const notesError = computed(() => props.fieldErrors.notes ?? '')

const canSubmit = computed(
  () =>
    Boolean(props.product) &&
    hasQuantity.value &&
    quantityError.value === '' &&
    (isPurchase.value || notes.value.trim().length > 0) &&
    stockAfter.value >= 0 &&
    !props.loading,
)

const signedQuantity = computed(() =>
  hasQuantity.value
    ? parsedQuantity.value > 0
      ? `+${formatNumber(parsedQuantity.value)}`
      : formatNumber(parsedQuantity.value)
    : '0',
)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    quantity.value = ''
    notes.value = ''
  },
)

const submit = () => {
  if (!canSubmit.value) return

  emit('submit', { quantity: parsedQuantity.value, notes: notes.value.trim() })
}
</script>

<template>
  <AppModal :open="open" :title="title" max-width="sm" @close="emit('close')">
    <div class="space-y-4">
      <div
        v-if="formError"
        class="rounded-lg border border-negative bg-negative-soft px-3 py-2 text-sm text-negative"
      >
        {{ formError }}
      </div>

      <div v-if="product" class="rounded-lg bg-ground px-3 py-2">
        <p class="text-sm font-medium text-ink">{{ product.name }}</p>
        <p class="text-xs text-ink-3">
          {{ product.sku }} · Stok saat ini {{ formatNumber(product.stock) }} {{ product.unit }}
        </p>
      </div>

      <AppInput
        v-model="quantity"
        :label="isPurchase ? 'Jumlah Masuk' : 'Jumlah Penyesuaian'"
        type="number"
        inputmode="numeric"
        :error="displayedQuantityError"
        :hint="
          isPurchase
            ? 'Masukkan jumlah barang yang masuk.'
            : 'Gunakan tanda minus untuk mengurangi stok.'
        "
        :required="true"
      />

      <AppTextarea
        v-model="notes"
        :label="isPurchase ? 'Catatan (opsional)' : 'Alasan'"
        :placeholder="
          isPurchase ? 'Contoh: Pembelian dari supplier' : 'Contoh: Barang rusak / koreksi stok'
        "
        :error="notesError"
        :hint="isPurchase ? '' : 'Wajib diisi agar perubahan stok dapat ditelusuri.'"
        :required="!isPurchase"
        :maxlength="255"
        :rows="2"
      />

      <div class="grid grid-cols-3 gap-2 rounded-lg border border-border p-3 text-center">
        <div>
          <p class="text-xs text-ink-3">Stok saat ini</p>
          <p class="mt-1 text-sm font-medium text-ink-2">
            {{ formatNumber(product?.stock ?? 0) }}
          </p>
        </div>
        <div>
          <p class="text-xs text-ink-3">Perubahan</p>
          <p class="mt-1 text-sm font-medium text-ink-2">{{ signedQuantity }}</p>
        </div>
        <div>
          <p class="text-xs text-ink-3">Stok akhir</p>
          <p
            class="mt-1 text-sm font-semibold"
            :class="stockAfter < 0 ? 'text-negative' : 'text-accent'"
          >
            {{ formatNumber(stockAfter) }}
          </p>
        </div>
      </div>

      <p v-if="stockAfter < 0" class="text-xs font-medium text-negative">
        Stok akhir tidak boleh negatif.
      </p>
    </div>

    <template #footer>
      <AppButton variant="secondary" :disabled="loading" @click="emit('close')">Batal</AppButton>
      <AppButton :loading="loading" :disabled="!canSubmit" @click="submit">
        {{ isPurchase ? 'Tambah Stok' : 'Simpan Penyesuaian' }}
      </AppButton>
    </template>
  </AppModal>
</template>