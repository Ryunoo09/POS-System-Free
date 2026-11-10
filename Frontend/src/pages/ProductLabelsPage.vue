<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import BarcodeLabel from '@/components/products/BarcodeLabel.vue'
import { useNotification } from '@/composables/useNotification'
import { useProductsStore } from '@/stores/products.store'
import type { Product } from '@/types/product'
import { MAX_PAGE_SIZE } from '@/utils/constants'
import { formatRupiah } from '@/utils/format'

const MAX_LABEL_QTY = 100

const router = useRouter()
const notify = useNotification()
const productsStore = useProductsStore()

const products = ref<Product[]>([])
const search = ref('')
const selected = ref<Record<string, number>>({})
const size = ref('40x30')

const isLoading = computed(() => productsStore.isLoading)
const error = computed(() => productsStore.error)

const sizeOptions = [
  { value: '40x30', label: '40 × 30 mm' },
  { value: '50x30', label: '50 × 30 mm' },
  { value: '58x40', label: '58 × 40 mm' },
]

const labelStyle = computed(() => {
  const [width, height] = size.value.split('x')
  return { width: `${width}mm`, height: `${height}mm` }
})

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return products.value

  return products.value.filter(
    (product) =>
      product.name.toLowerCase().includes(term) ||
      product.sku.toLowerCase().includes(term) ||
      (product.barcode ?? '').includes(term),
  )
})

const labels = computed(() => {
  const output: Product[] = []

  for (const product of products.value) {
    const quantity = selected.value[product.id] ?? 0
    for (let index = 0; index < quantity; index += 1) output.push(product)
  }

  return output
})

const load = async () => {
  await productsStore.fetchProducts({
    page: 1,
    limit: MAX_PAGE_SIZE,
    is_active: 'true',
  })
  products.value = productsStore.items
}

onMounted(load)

const toggle = (product: Product) => {
  if (!product.barcode) return

  if (selected.value[product.id]) {
    delete selected.value[product.id]
    return
  }

  selected.value[product.id] = 1
}

const setQuantity = (product: Product, value: number) => {
  const next = Math.floor(Number(value))

  if (!Number.isFinite(next) || next <= 0) {
    delete selected.value[product.id]
    return
  }

  selected.value[product.id] = Math.min(next, MAX_LABEL_QTY)
}

const print = () => {
  if (labels.value.length === 0) {
    notify.error('Pilih minimal satu produk untuk dicetak.')
    return
  }

  window.print()
}
</script>

<template>
  <section class="space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-[28px] font-semibold tracking-tight text-ink">Cetak Label Barcode</h1>
        <p class="mt-1 text-sm text-ink-3">
          Pilih produk dan jumlah label, lalu cetak melalui dialog cetak browser.
        </p>
      </div>
      <div class="flex gap-2">
        <AppButton variant="secondary" @click="router.push('/products')">Kembali</AppButton>
        <AppButton :disabled="labels.length === 0" @click="print">
          Cetak {{ labels.length }} Label
        </AppButton>
      </div>
    </header>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div class="space-y-3 rounded-xl border border-border bg-surface p-4">
        <div class="grid gap-3 sm:grid-cols-2">
          <AppInput v-model="search" label="Cari produk" placeholder="Nama, SKU, atau barcode" />
          <AppSelect v-model="size" label="Ukuran label" :options="sizeOptions" />
        </div>

        <div v-if="isLoading" class="space-y-3">
          <SkeletonBlock v-for="index in 5" :key="index" height="2.25rem" />
        </div>

        <ErrorState v-else-if="error" :message="error" @retry="load" />

        <EmptyState
          v-else-if="filtered.length === 0"
          title="Tidak ada produk"
          description="Ubah kata kunci pencarian atau tambahkan produk terlebih dahulu."
        />

        <div v-else class="max-h-[28rem] space-y-1 overflow-y-auto">
          <label
            v-for="product in filtered"
            :key="product.id"
            class="flex items-center gap-3 rounded-lg border border-transparent px-2 py-2 hover:bg-surface-2"
            :class="{ 'opacity-60': !product.barcode }"
          >
            <input
              type="checkbox"
              class="size-4"
              :checked="Boolean(selected[product.id])"
              :disabled="!product.barcode"
              @change="toggle(product)"
            />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium text-ink">{{ product.name }}</span>
              <span class="block text-xs text-ink-3">
                {{ product.sku }} ·
                {{ product.barcode ? product.barcode : 'tanpa barcode' }}
              </span>
            </span>
            <input
              v-if="selected[product.id]"
              type="number"
              min="1"
              :max="MAX_LABEL_QTY"
              class="h-8 w-16 rounded-md border border-border bg-surface px-2 text-sm"
              :value="selected[product.id]"
              @change="setQuantity(product, Number(($event.target as HTMLInputElement).value))"
            />
          </label>
        </div>
      </div>

      <div class="rounded-xl border border-border bg-surface p-4">
        <p class="mb-3 text-sm font-medium text-ink-2">Pratinjau</p>

        <EmptyState
          v-if="labels.length === 0"
          title="Belum ada label"
          description="Label yang dipilih akan tampil di sini sebelum dicetak."
        />

        <div v-else class="flex flex-wrap gap-2">
          <div
            v-for="(product, index) in labels"
            :key="`${product.id}-${index}`"
            class="flex flex-col items-center justify-center gap-0.5 overflow-hidden rounded border border-border bg-white p-1 text-center"
            :style="labelStyle"
          >
            <span class="w-full truncate text-[10px] font-medium text-black">
              {{ product.name }}
            </span>
            <span class="text-[9px] text-black">{{ product.sku }}</span>
            <BarcodeLabel v-if="product.barcode" :value="product.barcode" :height="28" :width="1.4" />
            <span class="text-[10px] font-semibold text-black">
              {{ formatRupiah(product.selling_price) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div id="label-print-root" class="hidden">
      <div
        v-for="(product, index) in labels"
        :key="`print-${product.id}-${index}`"
        class="flex flex-col items-center justify-center gap-0.5 overflow-hidden p-1 text-center"
        :style="labelStyle"
      >
        <span class="w-full truncate text-[10px] font-medium text-black">{{ product.name }}</span>
        <span class="text-[9px] text-black">{{ product.sku }}</span>
        <BarcodeLabel v-if="product.barcode" :value="product.barcode" :height="28" :width="1.4" />
        <span class="text-[10px] font-semibold text-black">
          {{ formatRupiah(product.selling_price) }}
        </span>
      </div>
    </div>
  </section>
</template>

<style>
@media print {
  body * {
    visibility: hidden;
  }

  #label-print-root,
  #label-print-root * {
    visibility: visible;
  }

  #label-print-root {
    position: absolute;
    inset: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 2mm;
    margin: 5mm;
  }
}
</style>