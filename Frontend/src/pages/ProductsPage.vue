<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import ProductFilters from '@/components/products/ProductFilters.vue'
import ProductForm from '@/components/products/ProductForm.vue'
import ProductTable from '@/components/products/ProductTable.vue'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import { useNotification } from '@/composables/useNotification'
import { useAuthStore } from '@/stores/auth.store'
import { useCategoriesStore } from '@/stores/categories.store'
import { useProductsStore } from '@/stores/products.store'
import type { Product, ProductFilterState, ProductFormValues } from '@/types/product'
import { errorFieldErrors, errorMessage } from '@/utils/errors'
import { PERMISSIONS } from '@/utils/permissions'
import { toProductCreatePayload, toProductUpdatePayload } from '@/utils/product-payload'
import { toProductParams } from '@/utils/query'

const auth = useAuthStore()
const productsStore = useProductsStore()
const categoriesStore = useCategoriesStore()
const notify = useNotification()
const router = useRouter()

const canWrite = computed(() => auth.hasPermission(PERMISSIONS.PRODUCT_WRITE))
const showCost = computed(() => auth.hasPermission(PERMISSIONS.COST_PRICE_READ))

const filters = ref<ProductFilterState>({ search: '', category_id: '', is_active: '' })
const debouncedSearch = useDebouncedRef(computed(() => filters.value.search), 300)
const page = ref(1)

const formOpen = ref(false)
const editing = ref<Product | null>(null)
const formError = ref('')
const fieldErrors = ref<Record<string, string>>({})

const toggleTarget = ref<Product | null>(null)

const categoryOptions = computed(() =>
  categoriesStore.options.map((category) => ({
    value: category.id,
    label: category.is_active ? category.name : `${category.name} (nonaktif)`,
  })),
)

const load = () => {
  void productsStore.fetchProducts(
    toProductParams({ ...filters.value, search: debouncedSearch.value }, page.value),
  )
}

watch(
  [debouncedSearch, () => filters.value.category_id, () => filters.value.is_active],
  () => {
    page.value = 1
  },
)

watch([page, debouncedSearch, () => filters.value.category_id, () => filters.value.is_active], load)

onMounted(() => {
  void categoriesStore.fetchCategoryOptions()
  load()
})

const openCreate = () => {
  editing.value = null
  formError.value = ''
  fieldErrors.value = {}
  formOpen.value = true
}

const openEdit = (product: Product) => {
  editing.value = product
  formError.value = ''
  fieldErrors.value = {}
  formOpen.value = true
}

const closeForm = () => {
  formOpen.value = false
}

const barcodeLoading = ref(false)

const generateBarcode = async () => {
  const product = editing.value
  if (!product) return

  barcodeLoading.value = true

  try {
    const barcode = await productsStore.generateBarcode(product.id)
    editing.value = { ...product, barcode }
    notify.success(`Barcode ${barcode} berhasil dibuat`)
    load()
  } catch (error) {
    notify.error(errorMessage(error, 'Gagal membuat barcode.'))
  } finally {
    barcodeLoading.value = false
  }
}

const submitForm = async (values: ProductFormValues) => {
  formError.value = ''
  fieldErrors.value = {}

  try {
    if (editing.value) {
      await productsStore.updateProduct(editing.value.id, toProductUpdatePayload(values))
      notify.success('Produk berhasil diperbarui')
    } else {
      await productsStore.createProduct(toProductCreatePayload(values))
      notify.success('Produk berhasil dibuat')
    }

    closeForm()
    load()
  } catch (error) {
    fieldErrors.value = errorFieldErrors(error)
    formError.value =
      Object.keys(fieldErrors.value).length > 0
        ? ''
        : errorMessage(error, 'Gagal menyimpan produk.')
  }
}

const toggleTitle = computed(() =>
  toggleTarget.value?.is_active ? 'Nonaktifkan produk' : 'Aktifkan produk',
)

const toggleMessage = computed(() => {
  const product = toggleTarget.value
  if (!product) return ''

  return product.is_active
    ? `Produk "${product.name}" tidak akan tampil di katalog kasir. Lanjutkan?`
    : `Produk "${product.name}" akan tampil kembali di katalog kasir. Lanjutkan?`
})

const confirmToggle = async () => {
  const product = toggleTarget.value
  if (!product) return

  try {
    if (product.is_active) {
      await productsStore.deactivateProduct(product.id)
      notify.success('Produk berhasil dinonaktifkan')
    } else {
      await productsStore.updateProduct(product.id, { is_active: true })
      notify.success('Produk berhasil diaktifkan')
    }

    load()
  } catch (error) {
    notify.error(errorMessage(error, 'Gagal memperbarui status produk.'))
  } finally {
    toggleTarget.value = null
  }
}
</script>

<template>
  <section class="space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-[28px] font-semibold tracking-tight text-ink">Produk</h1>
        <p class="mt-1 text-sm text-ink-3">Kelola katalog produk, harga, dan status aktif.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <AppButton variant="secondary" @click="router.push('/products/labels')">
          Cetak Label
        </AppButton>
        <AppButton v-if="canWrite" @click="openCreate">Tambah Produk</AppButton>
      </div>
    </header>

    <div class="rounded-xl border border-border bg-surface p-4">
      <ProductFilters v-model="filters" :categories="categoryOptions" />
    </div>

    <div class="overflow-hidden rounded-xl border border-border bg-surface">
      <div v-if="productsStore.isLoading" class="space-y-3 p-4">
        <SkeletonBlock v-for="index in 5" :key="index" height="2.25rem" />
      </div>

      <ErrorState
        v-else-if="productsStore.error"
        :message="productsStore.error"
        @retry="load"
      />

      <EmptyState
        v-else-if="productsStore.items.length === 0"
        title="Belum ada produk"
        description="Tambahkan produk pertama agar dapat dijual di halaman kasir."
      >
        <template v-if="canWrite" #action>
          <AppButton size="sm" @click="openCreate">Tambah Produk</AppButton>
        </template>
      </EmptyState>

      <template v-else>
        <ProductTable
          :products="productsStore.items"
          :can-write="canWrite"
          :show-cost="showCost"
          @edit="openEdit"
          @toggle="toggleTarget = $event"
        />
        <PaginationBar :meta="productsStore.meta" @change="page = $event" />
      </template>
    </div>

    <ProductForm
      :open="formOpen"
      :product="editing"
      :categories="categoryOptions"
      :loading="productsStore.isSaving"
      :barcode-loading="barcodeLoading"
      :field-errors="fieldErrors"
      :form-error="formError"
      @close="closeForm"
      @submit="submitForm"
      @generate="generateBarcode"
    />

    <ConfirmDialog
      :open="Boolean(toggleTarget)"
      :title="toggleTitle"
      :message="toggleMessage"
      :confirm-label="toggleTarget?.is_active ? 'Nonaktifkan' : 'Aktifkan'"
      :variant="toggleTarget?.is_active ? 'danger' : 'primary'"
      :loading="productsStore.isSaving"
      @confirm="confirmToggle"
      @cancel="toggleTarget = null"
    />
  </section>
</template>