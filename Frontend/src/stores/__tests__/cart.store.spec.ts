import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Product } from '@/types/product'
import type { CheckoutPayload, TransactionDetail } from '@/types/transaction'

const mocks = vi.hoisted(() => ({
  checkout:
    vi.fn<(payload: CheckoutPayload, idempotencyKey: string) => Promise<TransactionDetail>>(),
}))

vi.mock('@/services/transactions.service', () => ({
  transactionsService: {
    checkout: mocks.checkout,
  },
}))

const { useCartStore } = await import('../cart.store')

const product: Product = {
  id: 'product-1',
  sku: 'MKN-001',
  barcode: '8991234567890',
  name: 'Kopi Susu',
  description: null,
  category: { id: 'cat-1', name: 'Minuman' },
  unit: 'gelas',
  cost_price: '3000.00',
  selling_price: '3500.00',
  stock: 3,
  min_stock: 1,
  is_low_stock: false,
  is_active: true,
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-01T00:00:00.000Z',
}

const detail: TransactionDetail = {
  id: 'tx-1',
  invoice_number: 'INV-20261106-000001',
  status: 'COMPLETED',
  cashier: { id: 'cashier-1', name: 'Kasir' },
  items: [
    {
      id: 'tx-item-1',
      product_id: 'product-1',
      product_name: 'Kopi Susu',
      product_sku: 'MKN-001',
      quantity: 2,
      unit_price: '3500.00',
      discount_amount: '0.00',
      subtotal: '7000.00',
    },
  ],
  subtotal: '7000.00',
  discount_amount: '500.00',
  tax_amount: '0.00',
  total_amount: '6500.00',
  payment_method: 'CASH',
  payment_reference: null,
  amount_paid: '10000.00',
  change_amount: '3500.00',
  created_at: '2026-11-06T00:00:00.000Z',
}

const uuid = '3f2a8c1e-6b4d-4a9e-9c2f-1a2b3c4d5e6f'

describe('cart.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('menambah produk dan membatasi jumlah sesuai stok', () => {
    const store = useCartStore()

    expect(store.addProduct(product)).toBe(true)
    expect(store.addProduct(product)).toBe(true)
    expect(store.addProduct(product)).toBe(true)
    expect(store.addProduct(product)).toBe(false)

    expect(store.items).toHaveLength(1)
    expect(store.items[0]?.quantity).toBe(3)
    expect(store.itemCount).toBe(3)
  })

  it('menolak produk nonaktif atau stok habis', () => {
    const store = useCartStore()

    expect(store.addProduct({ ...product, is_active: false })).toBe(false)
    expect(store.addProduct({ ...product, stock: 0 })).toBe(false)
    expect(store.items).toHaveLength(0)
  })

  it('membatasi kuantitas minimal 1 dan maksimal stok', () => {
    const store = useCartStore()
    store.addProduct(product)

    store.setQuantity(product.id, 0)
    expect(store.items[0]?.quantity).toBe(1)

    store.setQuantity(product.id, 99)
    expect(store.items[0]?.quantity).toBe(3)
  })

  it('menghitung subtotal, diskon, dan total', () => {
    const store = useCartStore()
    store.addProduct(product)
    store.setQuantity(product.id, 2)

    expect(store.subtotal).toBe(7000)
    expect(store.totalAmount).toBe(7000)

    store.setDiscount(1000)
    expect(store.discount).toBe(1000)
    expect(store.totalAmount).toBe(6000)
  })

  it('menandai diskon yang melebihi subtotal', () => {
    const store = useCartStore()
    store.addProduct(product)

    store.setDiscount(99999)

    expect(store.discountError).not.toBe('')
    expect(store.discount).toBe(3500)
    expect(store.canCheckout).toBe(false)
  })

  it('menyinkronkan jumlah bayar non-tunai dengan total', () => {
    const store = useCartStore()
    store.addProduct(product)
    store.setQuantity(product.id, 2)

    store.setPaymentMethod('QRIS')
    expect(store.amountPaid).toBe(7000)
    expect(store.canCheckout).toBe(true)

    store.setPaymentMethod('CASH')
    store.setAmountPaid(1000)
    expect(store.canCheckout).toBe(false)

    store.setAmountPaid(7000)
    expect(store.canCheckout).toBe(true)
    expect(store.changeAmount).toBe(0)
  })

  it('mengirim payload checkout dengan idempotency key', async () => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(uuid)
    mocks.checkout.mockResolvedValue(detail)

    const store = useCartStore()
    store.addProduct(product)
    store.setQuantity(product.id, 2)
    store.setDiscount(500)
    store.setAmountPaid(10000)

    const result = await store.checkout()

    expect(mocks.checkout).toHaveBeenCalledWith(
      {
        items: [{ product_id: 'product-1', quantity: 2 }],
        discount_amount: 500,
        payment: { method: 'CASH', amount_paid: 10000 },
      },
      uuid,
    )
    expect(result).toBe(detail)
    expect(store.isCheckingOut).toBe(false)
  })

  it('menyertakan referensi untuk pembayaran non-tunai', async () => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(uuid)
    mocks.checkout.mockResolvedValue(detail)

    const store = useCartStore()
    store.addProduct(product)
    store.setPaymentMethod('QRIS')
    store.setReference('QR-001')

    await store.checkout()

    expect(mocks.checkout).toHaveBeenCalledWith(
      {
        items: [{ product_id: 'product-1', quantity: 1 }],
        discount_amount: 0,
        payment: { method: 'QRIS', amount_paid: 3500, reference: 'QR-001' },
      },
      uuid,
    )
  })

  it('mempertahankan keranjang saat checkout gagal', async () => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(uuid)
    mocks.checkout.mockRejectedValue(new Error('stok habis'))

    const store = useCartStore()
    store.addProduct(product)
    store.setPaymentMethod('QRIS')

    await expect(store.checkout()).rejects.toThrow('stok habis')

    expect(store.isCheckingOut).toBe(false)
    expect(store.items).toHaveLength(1)
  })

  it('mengosongkan keranjang dan mengembalikan metode ke tunai', () => {
    const store = useCartStore()
    store.addProduct(product)
    store.setPaymentMethod('QRIS')
    store.setReference('QR-1')
    store.setDiscount(100)

    store.clear()

    expect(store.items).toHaveLength(0)
    expect(store.paymentMethod).toBe('CASH')
    expect(store.amountPaid).toBe(0)
    expect(store.reference).toBe('')
    expect(store.discountAmount).toBe(0)
    expect(store.totalAmount).toBe(0)
  })
})
