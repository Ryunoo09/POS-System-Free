<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import CartPanel from '@/components/pos/CartPanel.vue'
import CheckoutSuccessDialog from '@/components/pos/CheckoutSuccessDialog.vue'
import PaymentPanel from '@/components/pos/PaymentPanel.vue'
import ProductGrid from '@/components/pos/ProductGrid.vue'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import { useAutoPrint } from '@/composables/useAutoPrint'
import { useCart } from '@/composables/useCart'
import { useNotification } from '@/composables/useNotification'
import { useCategoriesStore } from '@/stores/categories.store'
import { useProductsStore } from '@/stores/products.store'
import type { Product, ProductListParams } from '@/types/product'
import type { TransactionDetail } from '@/types/transaction'
import { errorFieldErrors, errorMessage } from '@/utils/errors'
import { formatRupiah } from '@/utils/format'

const POS_PAGE_SIZE = 24

const categories = useCategoriesStore()
const products = useProductsStore()
const notify = useNotification()
const {
  cart,
  items,
  subtotal,
  discount,
  discountAmount,
  discountError,
  taxAmount,
  totalAmount,
  changeAmount,
  itemCount,
  isCash,
  canCheckout,
  isCheckingOut,
  paymentMethod,
  amountPaid,
  reference,
} = useCart()

const search = ref('')
const debouncedSearch = useDebouncedRef(search, 300)
const categoryId = ref('')
const page = ref(1)
const barcode = ref('')
const barcodeWrapper = ref<HTMLElement | null>(null)
const searchWrapper = ref<HTMLElement | null>(null)
const paymentWrapper = ref<HTMLElement | null>(null)
const mobileView = ref<'catalog' | 'cart'>('catalog')

const clearOpen = ref(false)
const successOpen = ref(false)
const lastTransaction = ref<TransactionDetail | null>(null)
const checkoutError = ref('')
const checkoutFieldErrors = ref<Record<string, string>>({})

const { autoPrint, setAutoPrint } = useAutoPrint(
  successOpen,
  () => lastTransaction.value?.id ?? null,
)

const categoryChips = computed(() => [
  { id: '', name: 'Semua' },
  ...categories.options
    .filter((category) => category.is_active)
    .map((category) => ({ id: category.id, name: category.name })),
])

const params = computed<ProductListParams>(() => {
  const query: ProductListParams = {
    page: page.value,
    limit: POS_PAGE_SIZE,
    is_active: 'true',
  }
  const term = debouncedSearch.value.trim()
  if (term) query.search = term
  if (categoryId.value) query.category_id = categoryId.value
  return query
})

const loadProducts = (): void => {
  void products.fetchProducts(params.value)
}

const focusBarcode = (): void => {
  void nextTick(() => barcodeWrapper.value?.querySelector('input')?.focus())
}

const focusSearch = (): void => {
  void nextTick(() => searchWrapper.value?.querySelector('input')?.focus())
}

const focusPayment = (): void => {
  void nextTick(() => paymentWrapper.value?.querySelector('input')?.focus())
}

const addProduct = (product: Product): void => {
  if (!cart.addProduct(product)) {
    notify.error(`Stok ${product.name} tidak mencukupi.`)
  }
}

const submitBarcode = async (): Promise<void> => {
  const code = barcode.value.trim()
  if (!code) return

  try {
    const product = await products.findByBarcode(code)

    if (!product) {
      notify.error(`Barcode ${code} tidak ditemukan.`)
      return
    }

    if (!cart.addProduct(product)) {
      notify.error(`Stok ${product.name} tidak mencukupi.`)
      return
    }

    notify.success(`${product.name} ditambahkan.`)
  } catch (error) {
    notify.error(errorMessage(error, 'Gagal mencari barcode.'))
  } finally {
    barcode.value = ''
    focusBarcode()
  }
}

const itemErrors = computed<Record<string, string>>(() => {
  const mapped: Record<string, string> = {}

  Object.entries(checkoutFieldErrors.value).forEach(([field, message]) => {
    const match = field.match(/^items\[(\d+)\]/)
    if (!match) return

    const product = items.value[Number(match[1])]?.product
    if (product) mapped[product.id] = message
  })

  return mapped
})

const paymentError = computed(() => {
  const messages = Object.entries(checkoutFieldErrors.value)
    .filter(([field]) => !field.startsWith('items['))
    .map(([, message]) => message)

  if (checkoutError.value) messages.unshift(checkoutError.value)

  return messages.join(' ')
})

const runCheckout = async (): Promise<void> => {
  if (!canCheckout.value || isCheckingOut.value) return

  checkoutError.value = ''
  checkoutFieldErrors.value = {}

  try {
    const transaction = await cart.checkout()
    lastTransaction.value = transaction
    successOpen.value = true
    cart.clear()
    loadProducts()
  } catch (error) {
    const fields = errorFieldErrors(error)
    checkoutFieldErrors.value = fields
    const messages = Object.values(fields)
    checkoutError.value = messages.length > 0 ? '' : errorMessage(error, 'Checkout gagal.')

    notify.error(messages[0] ?? errorMessage(error, 'Checkout gagal.'))
  }
}

const startNewTransaction = (): void => {
  successOpen.value = false
  lastTransaction.value = null
  checkoutError.value = ''
  checkoutFieldErrors.value = {}
  focusBarcode()
}

const confirmClear = (): void => {
  cart.clear()
  clearOpen.value = false
  focusBarcode()
}

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'F2') {
    event.preventDefault()
    focusSearch()
  }

  if (event.key === 'F4') {
    event.preventDefault()
    focusPayment()
  }

  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    void runCheckout()
  }
}

watch([debouncedSearch, categoryId], () => {
  if (page.value !== 1) {
    page.value = 1
    return
  }

  loadProducts()
})

watch(page, loadProducts)

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  void categories.fetchCategoryOptions()
  loadProducts()
  focusBarcode()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <section class="space-y-4 pb-20 lg:pb-0">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-[28px] font-semibold tracking-tight text-ink">Kasir</h1>
        <p class="mt-1 text-sm text-ink-3">
          Pindai barcode atau pilih produk, lalu proses pembayaran.
        </p>
      </div>
      <p class="text-sm text-ink-3">
        {{ itemCount }} item · <span class="font-semibold text-ink">{{ formatRupiah(totalAmount) }}</span>
      </p>
    </header>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section :class="[mobileView === 'catalog' ? 'block' : 'hidden', 'space-y-4 lg:block']">
        <div class="rounded-xl border border-border bg-surface p-4">
          <div class="grid gap-3 sm:grid-cols-2">
            <div ref="barcodeWrapper">
              <AppInput
                v-model="barcode"
                label="Barcode"
                placeholder="Scan atau ketik barcode lalu Enter"
                autocomplete="off"
                @keydown.enter="submitBarcode"
              />
            </div>
            <div ref="searchWrapper">
              <AppInput
                v-model="search"
                label="Cari produk"
                placeholder="Nama, SKU, atau barcode"
              />
            </div>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            v-for="chip in categoryChips"
            :key="chip.id || 'all'"
            type="button"
            :class="[
              'rounded-full border px-3 py-1 text-xs font-medium transition',
              categoryId === chip.id
                ? 'border-accent bg-accent text-white'
                : 'border-border bg-surface text-ink-2 hover:bg-surface-2',
            ]"
            @click="categoryId = chip.id"
          >
            {{ chip.name }}
          </button>
        </div>

        <ProductGrid
          :products="products.items"
          :loading="products.isLoading"
          :error="products.error"
          @add="addProduct"
          @retry="loadProducts"
        />

        <PaginationBar :meta="products.meta" @change="page = $event" />
      </section>

      <aside :class="[mobileView === 'cart' ? 'block' : 'hidden', 'lg:block']">
        <div class="space-y-4 lg:sticky lg:top-4">
          <CartPanel
            :items="items"
            :subtotal="subtotal"
            :discount-input="discountAmount"
            :discount="discount"
            :discount-error="discountError"
            :tax-amount="taxAmount"
            :total-amount="totalAmount"
            :item-errors="itemErrors"
            :disabled="isCheckingOut"
            @increment="cart.increment"
            @decrement="cart.decrement"
            @remove="cart.removeItem"
            @update-quantity="(productId, quantity) => cart.setQuantity(productId, quantity)"
            @update:discount="cart.setDiscount"
            @clear="clearOpen = true"
          />

          <div ref="paymentWrapper">
            <PaymentPanel
              :method="paymentMethod"
              :amount-paid="amountPaid"
              :reference="reference"
              :total-amount="totalAmount"
              :change-amount="changeAmount"
              :is-cash="isCash"
              :can-checkout="canCheckout"
              :is-checking-out="isCheckingOut"
              :form-error="paymentError"
              @update:method="cart.setPaymentMethod"
              @update:amount-paid="cart.setAmountPaid"
              @update:reference="cart.setReference"
              @checkout="runCheckout"
            />
          </div>
        </div>
      </aside>
    </div>

    <div
      class="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-border bg-surface p-3 lg:hidden"
    >
      <div>
        <p class="text-xs text-ink-3">{{ itemCount }} item</p>
        <p class="text-base font-semibold text-ink">{{ formatRupiah(totalAmount) }}</p>
      </div>
      <AppButton @click="mobileView = mobileView === 'catalog' ? 'cart' : 'catalog'">
        {{ mobileView === 'catalog' ? 'Keranjang' : 'Katalog' }}
      </AppButton>
    </div>

    <CheckoutSuccessDialog
      :open="successOpen"
      :transaction="lastTransaction"
      :auto-print="autoPrint"
      @close="successOpen = false"
      @new-transaction="startNewTransaction"
      @update:auto-print="setAutoPrint"
    />

    <ConfirmDialog
      :open="clearOpen"
      title="Kosongkan keranjang?"
      message="Semua item di keranjang akan dihapus."
      confirm-label="Ya, kosongkan"
      variant="danger"
      @confirm="confirmClear"
      @cancel="clearOpen = false"
    />
  </section>
</template>
