<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import AppTextarea from '@/components/common/AppTextarea.vue'
import type { PurchaseOrderFormValues } from '@/types/purchase'
import { formatRupiah } from '@/utils/format'

export interface ProductOption {
  id: string
  name: string
  sku: string
  cost_price?: string
}

const props = withDefaults(
  defineProps<{
    open: boolean
    suppliers: ReadonlyArray<{ id: string; name: string }>
    products: ReadonlyArray<ProductOption>
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

const emit = defineEmits<{ close: []; submit: [values: PurchaseOrderFormValues] }>()

interface Row {
  product_id: string
  quantity: string
  cost_price: string
}

const form = reactive<{ supplier_id: string; notes: string; items: Row[] }>({
  supplier_id: '',
  notes: '',
  items: [{ product_id: '', quantity: '1', cost_price: '' }],
})
const localErrors = ref<Record<string, string>>({})

const supplierOptions = computed(() => props.suppliers.map((item) => ({
  value: item.id,
  label: item.name,
})))

const productOptions = computed(() => props.products.map((item) => ({
  value: item.id,
  label: `${item.name} (${item.sku})`,
})))

const resetForm = () => {
  form.supplier_id = ''
  form.notes = ''
  form.items = [{ product_id: '', quantity: '1', cost_price: '' }]
  localErrors.value = {}
}

watch(
  () => props.open,
  (open) => {
    if (open) resetForm()
  },
  { immediate: true },
)

const fieldError = (field: string): string =>
  localErrors.value[field] ?? props.fieldErrors[field] ?? ''

const lineSubtotal = (row: Row): number => {
  const quantity = Number(row.quantity)
  const cost = Number(row.cost_price)

  if (!Number.isFinite(quantity) || !Number.isFinite(cost)) return 0

  return quantity * cost
}

const total = computed(() => form.items.reduce((sum, row) => sum + lineSubtotal(row), 0))

const onProductChange = (index: number) => {
  const row = form.items[index]
  if (!row) return

  const product = props.products.find((item) => item.id === row.product_id)
  if (product?.cost_price !== undefined) {
    row.cost_price = String(Number(product.cost_price))
  }
}

const addRow = () => {
  form.items.push({ product_id: '', quantity: '1', cost_price: '' })
}

const removeRow = (index: number) => {
  if (form.items.length > 1) form.items.splice(index, 1)
}

const submit = () => {
  const errors: Record<string, string> = {}

  if (!form.supplier_id) errors.supplier_id = 'Supplier wajib dipilih'

  const seen = new Set<string>()

  form.items.forEach((row, index) => {
    if (!row.product_id) {
      errors[`items.${index}.product_id`] = 'Produk wajib dipilih'
      return
    }

    if (seen.has(row.product_id)) {
      errors[`items.${index}.product_id`] = 'Produk duplikat'
    }
    seen.add(row.product_id)

    const quantity = Number(row.quantity)
    if (!Number.isInteger(quantity) || quantity < 1) {
      errors[`items.${index}.quantity`] = 'Kuantitas minimal 1'
    }

    const cost = Number(row.cost_price)
    if (!Number.isFinite(cost) || cost < 0) {
      errors[`items.${index}.cost_price`] = 'Harga beli tidak valid'
    }
  })

  localErrors.value = errors

  if (Object.keys(errors).length > 0) return

  emit('submit', {
    supplier_id: form.supplier_id,
    notes: form.notes.trim(),
    items: form.items.map((row) => ({
      product_id: row.product_id,
      quantity: Number(row.quantity),
      cost_price: Number(row.cost_price),
    })),
  })
}
</script>

<template>
  <AppModal :open="open" title="Buat Purchase Order" max-width="lg" @close="emit('close')">
    <form id="purchase-order-form" class="space-y-4" novalidate @submit.prevent="submit">
      <div
        v-if="formError"
        class="rounded-lg border border-negative bg-negative-soft px-3 py-2 text-sm text-negative"
        role="alert"
      >
        {{ formError }}
      </div>

      <AppSelect
        v-model="form.supplier_id"
        label="Supplier"
        placeholder="Pilih supplier"
        :options="supplierOptions"
        :error="fieldError('supplier_id')"
        required
      />

      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-ink">Item pembelian</h3>
          <AppButton variant="secondary" size="sm" type="button" @click="addRow">
            Tambah item
          </AppButton>
        </div>

        <div
          v-for="(row, index) in form.items"
          :key="index"
          class="grid gap-3 rounded-lg border border-border bg-surface-2/40 p-3 sm:grid-cols-[1fr_5rem_8rem_auto] sm:items-end"
        >
          <AppSelect
            v-model="row.product_id"
            label="Produk"
            placeholder="Pilih produk"
            :options="productOptions"
            :error="fieldError(`items.${index}.product_id`)"
            @update:model-value="onProductChange(index)"
          />
          <AppInput
            v-model="row.quantity"
            label="Qty"
            type="number"
            min="1"
            inputmode="numeric"
            :error="fieldError(`items.${index}.quantity`)"
          />
          <AppInput
            v-model="row.cost_price"
            label="Harga beli"
            type="number"
            min="0"
            inputmode="decimal"
            :error="fieldError(`items.${index}.cost_price`)"
          >
            <template #prefix>Rp</template>
          </AppInput>
          <div class="flex items-center justify-between gap-2 sm:flex-col sm:items-end">
            <span class="text-sm font-medium text-ink">{{ formatRupiah(lineSubtotal(row)) }}</span>
            <AppButton
              variant="ghost"
              size="sm"
              type="button"
              :disabled="form.items.length === 1"
              @click="removeRow(index)"
            >
              Hapus
            </AppButton>
          </div>
        </div>
      </div>

      <AppTextarea
        v-model="form.notes"
        label="Catatan"
        placeholder="Opsional"
        :maxlength="500"
      />

      <div class="flex items-center justify-between rounded-lg bg-surface-2 px-4 py-3">
        <span class="text-sm font-medium text-ink-2">Total pembelian</span>
        <span class="text-base font-semibold text-ink">{{ formatRupiah(total) }}</span>
      </div>
    </form>

    <template #footer>
      <AppButton variant="secondary" :disabled="loading" @click="emit('close')">Batal</AppButton>
      <AppButton type="submit" form="purchase-order-form" :loading="loading">Simpan PO</AppButton>
    </template>
  </AppModal>
</template>