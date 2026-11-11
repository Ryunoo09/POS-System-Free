<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useNotification } from '@/composables/useNotification'
import { useCategoriesStore } from '@/stores/categories.store'
import { usePricesStore } from '@/stores/prices.store'
import { useProductsStore } from '@/stores/products.store'
import type { BulkPriceMode, BulkPricePayload } from '@/types/price'
import { MAX_PAGE_SIZE } from '@/utils/constants'
import { errorMessage } from '@/utils/errors'
import { formatRupiah } from '@/utils/format'

const router = useRouter()
const notify = useNotification()
const pricesStore = usePricesStore()
const productsStore = useProductsStore()
const categoriesStore = useCategoriesStore()

const modeOptions: Array<{ value: BulkPriceMode; label: string }> = [
  { value: 'SET', label: 'Set harga baru' },
  { value: 'PERCENT', label: 'Naik/turun persen' },
  { value: 'NOMINAL', label: 'Tambah/kurang nominal' },
]

const form = reactive({
  target: 'category' as 'category' | 'products',
  category_id: '',
  mode: 'PERCENT' as BulkPriceMode,
  value: '',
  reason: '',
})

const selectedIds = ref<Record<string, boolean>>({})
const formError = ref('')

const categoryOptions = computed(() =>
  categoriesStore.options.map((category) => ({ value: category.id, label: category.name })),
)

const selectedProductIds = computed(() => Object.keys(selectedIds.value).filter((id) => selectedIds.value[id]))

const previewCount = computed(() => pricesStore.preview.length)

onMounted(async () => {
  await Promise.all([
    categoriesStore.fetchCategoryOptions(),
    productsStore.fetchProducts({ page: 1, limit: MAX_PAGE_SIZE, is_active: 'true' }),
  ])
})

const buildPayload = (): BulkPricePayload | null => {
  const value = Number(form.value)

  if (!Number.isFinite(value)) {
    formError.value = 'Nilai wajib berupa angka.'
    return null
  }

  if (form.target === 'category' && !form.category_id) {
    formError.value = 'Pilih kategori terlebih dahulu.'
    return null
  }

  if (form.target === 'products' && selectedProductIds.value.length === 0) {
    formError.value = 'Pilih minimal satu produk.'
    return null
  }

  return {
    mode: form.mode,
    value,
    ...(form.target === 'category'
      ? { category_id: form.category_id }
      : { product_ids: selectedProductIds.value }),
  }
}

const preview = async () => {
  formError.value = ''

  const payload = buildPayload()
  if (!payload) return

  try {
    await pricesStore.previewBulk(payload)
  } catch (error) {
    formError.value = errorMessage(error, 'Gagal menghitung pratinjau.')
  }
}

const apply = async () => {
  formError.value = ''

  const payload = buildPayload()
  if (!payload) return

  if (form.reason.trim().length < 3) {
    formError.value = 'Alasan minimal 3 karakter.'
    return
  }

  try {
    const updated = await pricesStore.applyBulk({ ...payload, reason: form.reason.trim() })
    notify.success(`${updated} harga produk diperbarui`)
    pricesStore.clearPreview()
    router.push('/products')
  } catch (error) {
    formError.value = errorMessage(error, 'Gagal menerapkan harga massal.')
  }
}

const toggleProduct = (id: string) => {
  if (selectedIds.value[id]) {
    delete selectedIds.value[id]
    return
  }

  selectedIds.value[id] = true
}
</script>

<template>
  <section class="space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-[28px] font-semibold tracking-tight text-ink">Update Harga Massal</h1>
        <p class="mt-1 text-sm text-ink-3">
          Hitung pratinjau lebih dulu, lalu terapkan ke harga jual produk terpilih.
        </p>
      </div>
      <AppButton variant="secondary" @click="router.push('/products')">Kembali</AppButton>
    </header>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div class="space-y-3 rounded-xl border border-border bg-surface p-4">
        <AppSelect
          v-model="form.target"
          label="Target"
          :options="[
            { value: 'category', label: 'Per kategori' },
            { value: 'products', label: 'Pilih produk' },
          ]"
        />

        <AppSelect
          v-if="form.target === 'category'"
          v-model="form.category_id"
          label="Kategori"
          :options="[{ value: '', label: 'Pilih kategori' }, ...categoryOptions]"
        />

        <AppSelect v-model="form.mode" label="Mode" :options="modeOptions" />

        <AppInput
          v-model="form.value"
          label="Nilai"
          type="number"
          inputmode="decimal"
          :hint="form.mode === 'PERCENT' ? 'Contoh: 10 untuk naik 10%%, -5 untuk turun 5%%' : ''"
        />

        <AppInput v-model="form.reason" label="Alasan" placeholder="Mis. penyesuaian harga pasar" />

        <p v-if="formError" class="text-sm text-negative">{{ formError }}</p>

        <div class="flex flex-wrap gap-2">
          <AppButton variant="secondary" :loading="pricesStore.isSaving" @click="preview">
            Hitung Pratinjau
          </AppButton>
          <AppButton :disabled="previewCount === 0" :loading="pricesStore.isSaving" @click="apply">
            Terapkan ke {{ previewCount }} Produk
          </AppButton>
        </div>
      </div>

      <div class="space-y-4">
        <div
          v-if="form.target === 'products'"
          class="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-border bg-surface p-3"
        >
          <label
            v-for="product in productsStore.items"
            :key="product.id"
            class="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2"
          >
            <input
              type="checkbox"
              class="size-4"
              :checked="Boolean(selectedIds[product.id])"
              @change="toggleProduct(product.id)"
            />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm text-ink">{{ product.name }}</span>
              <span class="block text-xs text-ink-3">
                {{ product.sku }} · {{ formatRupiah(product.selling_price) }}
              </span>
            </span>
          </label>
        </div>

        <div class="rounded-xl border border-border bg-surface p-4">
          <p class="mb-3 text-sm font-medium text-ink-2">Pratinjau</p>

          <EmptyState
            v-if="previewCount === 0"
            title="Belum ada pratinjau"
            description="Pratinjau menampilkan harga lama dan harga baru tanpa menyimpan."
          />

          <div v-else class="max-h-96 overflow-y-auto">
            <table class="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr class="text-left text-xs uppercase tracking-wide text-ink-3">
                  <th scope="col" class="px-3 py-2 font-medium">Produk</th>
                  <th scope="col" class="px-3 py-2 font-medium">Harga Lama</th>
                  <th scope="col" class="px-3 py-2 font-medium">Harga Baru</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr v-for="item in pricesStore.preview" :key="item.id">
                  <td class="px-3 py-2">
                    <p class="text-ink">{{ item.name }}</p>
                    <p class="text-xs text-ink-3">{{ item.sku }}</p>
                  </td>
                  <td class="px-3 py-2 text-ink-2">{{ formatRupiah(item.old_price) }}</td>
                  <td class="px-3 py-2 font-medium text-ink">{{ formatRupiah(item.new_price) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
