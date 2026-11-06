<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import AppTextarea from '@/components/common/AppTextarea.vue'
import type { Product, ProductFormValues } from '@/types/product'

interface FormState {
  sku: string
  barcode: string
  name: string
  description: string
  category_id: string
  unit: string
  cost_price: string
  selling_price: string
  stock: string
  min_stock: string
}

const props = withDefaults(
  defineProps<{
    open: boolean
    product?: Product | null
    categories: ReadonlyArray<{ value: string; label: string }>
    loading?: boolean
    fieldErrors?: Record<string, string>
    formError?: string
  }>(),
  {
    product: null,
    loading: false,
    fieldErrors: () => ({}),
    formError: '',
  },
)

const emit = defineEmits<{ close: []; submit: [values: ProductFormValues] }>()

const isUpdate = computed(() => Boolean(props.product))
const title = computed(() => (isUpdate.value ? 'Ubah Produk' : 'Tambah Produk'))

const form = reactive<FormState>({
  sku: '',
  barcode: '',
  name: '',
  description: '',
  category_id: '',
  unit: '',
  cost_price: '',
  selling_price: '',
  stock: '',
  min_stock: '',
})

const localErrors = ref<Record<string, string>>({})

const resetForm = () => {
  const product = props.product

  form.sku = product?.sku ?? ''
  form.barcode = product?.barcode ?? ''
  form.name = product?.name ?? ''
  form.description = product?.description ?? ''
  form.category_id = product?.category.id ?? ''
  form.unit = product?.unit ?? ''
  form.cost_price = product?.cost_price ? String(Number(product.cost_price)) : ''
  form.selling_price = product?.selling_price ? String(Number(product.selling_price)) : ''
  form.stock = product ? String(product.stock) : ''
  form.min_stock = product ? String(product.min_stock) : ''
  localErrors.value = {}
}

watch(
  () => props.open,
  (open) => {
    if (open) resetForm()
  },
  { immediate: true },
)

const amountError = (value: string, label: string): string => {
  if (!value.trim()) return `${label} wajib diisi`

  const amount = Number(value)

  if (!Number.isFinite(amount)) return `${label} harus berupa angka`
  if (amount < 0) return `${label} tidak boleh negatif`
  if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6) {
    return `${label} maksimal 2 digit desimal`
  }

  return ''
}

const integerError = (value: string, label: string): string => {
  if (!value.trim()) return `${label} wajib diisi`

  const amount = Number(value)

  if (!Number.isInteger(amount)) return `${label} harus bilangan bulat`
  if (amount < 0) return `${label} tidak boleh negatif`

  return ''
}

const validate = (): Record<string, string> => {
  const errors: Record<string, string> = {}
  const sku = form.sku.trim()
  const barcode = form.barcode.trim()

  if (!sku) {
    errors.sku = 'SKU wajib diisi'
  } else if (sku.length < 3 || sku.length > 50) {
    errors.sku = 'SKU harus 3–50 karakter'
  } else if (!/^[A-Za-z0-9-]+$/.test(sku)) {
    errors.sku = 'SKU hanya boleh huruf, angka, atau tanda hubung'
  }

  if (barcode && !/^\d{8,50}$/.test(barcode)) {
    errors.barcode = 'Barcode harus 8–50 digit angka'
  }

  if (!form.name.trim()) {
    errors.name = 'Nama produk wajib diisi'
  } else if (form.name.trim().length > 150) {
    errors.name = 'Nama produk maksimal 150 karakter'
  }

  if (form.description.trim().length > 2000) {
    errors.description = 'Deskripsi maksimal 2000 karakter'
  }

  if (!form.category_id) errors.category_id = 'Kategori wajib dipilih'

  if (!form.unit.trim()) {
    errors.unit = 'Satuan wajib diisi'
  } else if (form.unit.trim().length > 20) {
    errors.unit = 'Satuan maksimal 20 karakter'
  }

  const costPriceError = amountError(form.cost_price, 'Harga modal')
  const sellingPriceError = amountError(form.selling_price, 'Harga jual')

  if (costPriceError) errors.cost_price = costPriceError
  if (sellingPriceError) errors.selling_price = sellingPriceError

  if (!isUpdate.value) {
    const stockError = integerError(form.stock, 'Stok awal')
    if (stockError) errors.stock = stockError
  }

  const minStockError = integerError(form.min_stock, 'Stok minimum')
  if (minStockError) errors.min_stock = minStockError

  return errors
}

const marginWarning = computed(() => {
  if (!form.cost_price.trim() || !form.selling_price.trim()) return false

  const costPrice = Number(form.cost_price)
  const sellingPrice = Number(form.selling_price)

  return (
    Number.isFinite(costPrice) && Number.isFinite(sellingPrice) && sellingPrice < costPrice
  )
})

const fieldError = (field: string): string => localErrors.value[field] ?? props.fieldErrors[field] ?? ''

const submit = () => {
  const errors = validate()
  localErrors.value = errors

  if (Object.keys(errors).length > 0) return

  emit('submit', {
    sku: form.sku,
    barcode: form.barcode,
    name: form.name,
    description: form.description,
    category_id: form.category_id,
    unit: form.unit,
    cost_price: Number(form.cost_price),
    selling_price: Number(form.selling_price),
    stock: isUpdate.value ? (props.product?.stock ?? 0) : Number(form.stock),
    min_stock: Number(form.min_stock),
  })
}
</script>

<template>
  <AppModal :open="open" :title="title" max-width="lg" @close="emit('close')">
    <form id="product-form" class="space-y-4" novalidate @submit.prevent="submit">
      <div
        v-if="formError"
        class="rounded-lg border border-negative bg-negative-soft px-3 py-2 text-sm text-negative"
        role="alert"
      >
        {{ formError }}
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <AppInput
          v-model="form.sku"
          label="SKU"
          placeholder="Contoh: MKN-001"
          :error="fieldError('sku')"
          required
        />
        <AppInput
          v-model="form.barcode"
          label="Barcode"
          placeholder="Opsional, 8–50 digit"
          inputmode="numeric"
          :error="fieldError('barcode')"
        />
      </div>

      <AppInput
        v-model="form.name"
        label="Nama produk"
        placeholder="Nama produk yang tampil di kasir"
        :error="fieldError('name')"
        required
      />

      <AppTextarea
        v-model="form.description"
        label="Deskripsi"
        placeholder="Opsional"
        :maxlength="2000"
        :error="fieldError('description')"
      />

      <div class="grid gap-4 sm:grid-cols-2">
        <AppSelect
          v-model="form.category_id"
          label="Kategori"
          placeholder="Pilih kategori"
          :options="categories"
          :error="fieldError('category_id')"
          required
        />
        <AppInput
          v-model="form.unit"
          label="Satuan"
          placeholder="pcs, kg, botol"
          :error="fieldError('unit')"
          required
        />
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <AppInput
          v-model="form.cost_price"
          label="Harga modal"
          placeholder="0"
          inputmode="decimal"
          :error="fieldError('cost_price')"
          required
        />
        <AppInput
          v-model="form.selling_price"
          label="Harga jual"
          placeholder="0"
          inputmode="decimal"
          :error="fieldError('selling_price')"
          required
        />
      </div>

      <div
        v-if="marginWarning"
        class="rounded-lg border border-warning bg-warning-soft px-3 py-2 text-sm text-warning"
        role="status"
      >
        Harga jual lebih rendah dari harga modal. Periksa kembali agar tidak merugi.
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <template v-if="isUpdate">
          <div>
            <AppInput
              :model-value="product?.stock ?? 0"
              label="Stok saat ini"
              disabled
              hint="Stok hanya dapat diubah melalui halaman Inventori."
            />
            <RouterLink
              to="/inventory"
              class="mt-1 inline-block text-xs font-medium text-accent hover:underline"
            >
              Buka halaman Inventori
            </RouterLink>
          </div>
        </template>
        <AppInput
          v-else
          v-model="form.stock"
          label="Stok awal"
          placeholder="0"
          inputmode="numeric"
          :error="fieldError('stock')"
          required
        />

        <AppInput
          v-model="form.min_stock"
          label="Stok minimum"
          placeholder="0"
          inputmode="numeric"
          :error="fieldError('min_stock')"
          required
        />
      </div>
    </form>

    <template #footer>
      <AppButton variant="secondary" :disabled="loading" @click="emit('close')">Batal</AppButton>
      <AppButton type="submit" form="product-form" :loading="loading">Simpan</AppButton>
    </template>
  </AppModal>
</template>