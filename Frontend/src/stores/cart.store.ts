import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { transactionsService } from '@/services/transactions.service'
import type { CartItem } from '@/types/cart'
import type { CheckoutPayload, PaymentMethod, TransactionDetail } from '@/types/transaction'
import type { Product } from '@/types/product'
import { calculateCartChange, calculateCartTotals } from '@/utils/pricing'

const configuredTaxRate = Number(import.meta.env.VITE_TAX_RATE ?? 0)
const TAX_RATE =
  Number.isFinite(configuredTaxRate) && configuredTaxRate >= 0 ? configuredTaxRate : 0

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])
  const discountAmount = ref(0)
  const paymentMethod = ref<PaymentMethod>('CASH')
  const amountPaid = ref(0)
  const reference = ref('')
  const isCheckingOut = ref(false)

  const subtotal = computed(() =>
    items.value.reduce(
      (sum, item) => sum + Number(item.product.selling_price) * item.quantity,
      0,
    ),
  )

  const discount = computed(() =>
    Math.min(Math.max(discountAmount.value, 0), subtotal.value),
  )

  const discountError = computed(() =>
    discountAmount.value > subtotal.value ? 'Diskon melebihi subtotal' : '',
  )

  const totals = computed(() =>
    calculateCartTotals({
      items: items.value.map((item) => ({
        unitPrice: item.product.selling_price,
        quantity: item.quantity,
      })),
      discountAmount: discount.value,
      taxRate: TAX_RATE,
    }),
  )

  const taxAmount = computed(() => totals.value.taxAmount)
  const totalAmount = computed(() => totals.value.totalAmount)
  const changeAmount = computed(() =>
    calculateCartChange({
      method: paymentMethod.value,
      total: totalAmount.value,
      amountPaid: amountPaid.value,
    }),
  )
  const itemCount = computed(() =>
    items.value.reduce((sum, item) => sum + item.quantity, 0),
  )
  const isEmpty = computed(() => items.value.length === 0)
  const isCash = computed(() => paymentMethod.value === 'CASH')
  const canCheckout = computed(
    () =>
      items.value.length > 0 &&
      discountError.value === '' &&
      (isCash.value
        ? amountPaid.value >= totalAmount.value
        : amountPaid.value === totalAmount.value),
  )

  watch(totalAmount, (value) => {
    if (paymentMethod.value !== 'CASH') amountPaid.value = value
  })

  const addProduct = (product: Product): boolean => {
    if (!product.is_active || product.stock <= 0) return false

    const existing = items.value.find((item) => item.product.id === product.id)

    if (!existing) {
      items.value.push({ product, quantity: 1 })
      return true
    }

    if (existing.quantity >= product.stock) return false

    existing.quantity += 1
    return true
  }

  const setQuantity = (productId: string, quantity: number): void => {
    const item = items.value.find((entry) => entry.product.id === productId)
    if (!item) return

    const next = Math.floor(Number(quantity))
    if (!Number.isFinite(next)) return

    item.quantity = Math.min(Math.max(next, 1), item.product.stock)
  }

  const increment = (productId: string): void => {
    const item = items.value.find((entry) => entry.product.id === productId)
    if (item) setQuantity(productId, item.quantity + 1)
  }

  const decrement = (productId: string): void => {
    const item = items.value.find((entry) => entry.product.id === productId)
    if (item) setQuantity(productId, item.quantity - 1)
  }

  const removeItem = (productId: string): void => {
    items.value = items.value.filter((entry) => entry.product.id !== productId)
  }

  const setDiscount = (value: number): void => {
    discountAmount.value = Math.max(Number(value) || 0, 0)
  }

  const setPaymentMethod = (method: PaymentMethod): void => {
    paymentMethod.value = method
    if (method !== 'CASH') amountPaid.value = totalAmount.value
  }

  const setAmountPaid = (value: number): void => {
    amountPaid.value = Math.max(Number(value) || 0, 0)
  }

  const setReference = (value: string): void => {
    reference.value = value
  }

  const clear = (): void => {
    items.value = []
    discountAmount.value = 0
    paymentMethod.value = 'CASH'
    amountPaid.value = 0
    reference.value = ''
  }

  const checkout = async (): Promise<TransactionDetail> => {
    const payload: CheckoutPayload = {
      items: items.value.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
      })),
      discount_amount: discount.value,
      payment: {
        method: paymentMethod.value,
        amount_paid: amountPaid.value,
        ...(reference.value.trim() ? { reference: reference.value.trim() } : {}),
      },
    }

    isCheckingOut.value = true

    try {
      return await transactionsService.checkout(payload, crypto.randomUUID())
    } finally {
      isCheckingOut.value = false
    }
  }

  return {
    items,
    discountAmount,
    paymentMethod,
    amountPaid,
    reference,
    isCheckingOut,
    subtotal,
    discount,
    discountError,
    taxAmount,
    totalAmount,
    changeAmount,
    itemCount,
    isEmpty,
    isCash,
    canCheckout,
    addProduct,
    setQuantity,
    increment,
    decrement,
    removeItem,
    setDiscount,
    setPaymentMethod,
    setAmountPaid,
    setReference,
    clear,
    checkout,
  }
})
