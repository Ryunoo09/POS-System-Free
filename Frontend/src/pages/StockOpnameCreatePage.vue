<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import AppTextarea from '@/components/common/AppTextarea.vue'
import { useNotification } from '@/composables/useNotification'
import { useCategoriesStore } from '@/stores/categories.store'
import { useProductsStore } from '@/stores/products.store'
import { useStockOpnamesStore } from '@/stores/stock-opnames.store'
import type { StockOpnameCreatePayload, StockOpnameScope } from '@/types/stock-opname'
import { errorFieldErrors, errorMessage } from '@/utils/errors'

type Option = { value: string; label: string }

const scopeOptions: ReadonlyArray<Option> = [
  { value: 'ALL', label: 'Semua produk aktif' },
  { value: 'CATEGORY', label: 'Per kategori' },
  { value: 'PRODUCT', label: 'Pilih produk' },
]

const router = useRouter()
const notify = useNotification()
const store = useStockOpnamesStore()
const products = useProductsStore()
const categories = useCategoriesStore()

const name = ref('')
const scope = ref<StockOpnameScope>('ALL')
const notes = ref('')
const categoryIds = ref<string[]>([])
const productIds = ref<string[]>([])
const productSearch = ref('')
const fieldErrors = ref<Record<string, string>>({})
const formError = ref('')

// ponytail: opsi produk dibatasi MAX_PAGE_SIZE (100) dari products.store.
// Ganti ke pencarian server-side bila katalog > 100 produk.
const filteredProducts = computed(() => {
  const term = productSearch.value.trim().toLowerCase()
  if (!term) return products.options

  return products.options.filter(
    (product) =>
      product.name.toLowerCase().includes(term) || product.sku.toLowerCase().includes(term),
  )
})

const toggle = (list: string[], id: string): string[] =>
  list.includes(id) ? list.filter((value) => value !== id) : [...list, id]

const toggleCategory = (id: string): void => {
  categoryIds.value = toggle(categoryIds.value, id)
}

const toggleProduct = (id: string): void => {
  productIds.value = toggle(productIds.value, id)
}

const payload = (): StockOpnameCreatePayload => {
  const result: StockOpnameCreatePayload = { name: name.value.trim(), scope: scope.value }

  if (scope.value === 'CATEGORY') result.category_ids = categoryIds.value
  else if (scope.value === 'PRODUCT') result.product_ids = productIds.value

  if (notes.value.trim()) result.notes = notes.value.trim()
  return result
}

const submit = async (): Promise<void> => {
  fieldErrors.value = {}
  formError.value = ''

  if (!name.value.trim()) {
    fieldErrors.value = { name: 'Nama sesi wajib diisi' }
    return
  }

  if (scope.value === 'CATEGORY' && categoryIds.value.length === 0) {
    fieldErrors.value = { category_ids: 'Pilih minimal satu kategori' }
    return
  }

  if (scope.value === 'PRODUCT' && productIds.value.length === 0) {
    fieldErrors.value = { product_ids: 'Pilih minimal satu produk' }
    return
  }

  try {
    const detail = await store.create(payload())
    notify.success(`Sesi ${detail.session_number} dibuat`)
    await router.push(`/stock-opnames/${detail.id}`)
  } catch (error) {
    const fields = errorFieldErrors(error)
    fieldErrors.value = fields
    formError.value = Object.keys(fields).length ? '' : errorMessage(error, 'Gagal membuat sesi opname.')
  }
}

onMounted(() => {
  void products.fetchProductOptions()
  void categories.fetchCategoryOptions()
})
</script>

<template>
  <section class="space-y-6">
    <header>
      <h1 class="text-[28px] font-semibold tracking-tight text-ink">Sesi Opname Baru</h1>
      <p class="mt-1 text-sm text-ink-3">
        Item sesi digenerate dari produk aktif pada cakupan yang dipilih.
      </p>
    </header>

    <form class="space-y-5 rounded-xl border border-border bg-surface p-5" @submit.prevent="submit">
      <div class="grid gap-4 md:grid-cols-2">
        <AppInput v-model="name" label="Nama sesi" required :error="fieldErrors.name" />
        <AppSelect v-model="scope" label="Cakupan" :options="scopeOptions" />
      </div>

      <div v-if="scope === 'CATEGORY'" class="space-y-2">
        <p class="text-[13px] font-medium text-ink-2">Kategori</p>
        <p v-if="fieldErrors.category_ids" class="text-xs text-negative">
          {{ fieldErrors.category_ids }}
        </p>
        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <label
            v-for="category in categories.options"
            :key="category.id"
            class="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-ink-2"
          >
            <input
              type="checkbox"
              class="size-4 rounded border-border"
              :checked="categoryIds.includes(category.id)"
              @change="toggleCategory(category.id)"
            />
            {{ category.name }}
          </label>
        </div>
      </div>

      <div v-if="scope === 'PRODUCT'" class="space-y-2">
        <AppInput v-model="productSearch" label="Cari produk" placeholder="Nama atau SKU" />
        <p v-if="fieldErrors.product_ids" class="text-xs text-negative">
          {{ fieldErrors.product_ids }}
        </p>
        <div class="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
          <label
            v-for="product in filteredProducts"
            :key="product.id"
            class="flex items-center gap-2 text-sm text-ink-2"
          >
            <input
              type="checkbox"
              class="size-4 rounded border-border"
              :checked="productIds.includes(product.id)"
              @change="toggleProduct(product.id)"
            />
            <span class="font-medium text-ink">{{ product.name }}</span>
            <span class="text-xs text-ink-3">{{ product.sku }}</span>
          </label>
          <p v-if="filteredProducts.length === 0" class="text-sm text-ink-3">
            Produk tidak ditemukan.
          </p>
        </div>
      </div>

      <AppTextarea v-model="notes" label="Catatan" :rows="3" :maxlength="500" />

      <p v-if="formError" class="text-sm text-negative">{{ formError }}</p>

      <div class="flex justify-end gap-2">
        <AppButton variant="secondary" @click="router.push('/stock-opnames')">Batal</AppButton>
        <AppButton type="submit" :loading="store.isSaving">Buat Sesi</AppButton>
      </div>
    </form>
  </section>
</template>