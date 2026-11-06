export interface CartPricingItem {
  unitPrice: string | number
  quantity: number
}

export interface CartPricingInput {
  items: CartPricingItem[]
  discountAmount: number
  taxRate: number
}

export interface CartTotals {
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
}

const toMinor = (value: string | number): number => Math.round(Number(value) * 100)

const fromMinor = (minor: number): number => minor / 100

/**
 * Cermin `Backend/src/utils/pricing.ts` untuk tampilan (BR-024).
 * Nilai final struk tetap berasal dari response backend.
 */
export const calculateCartTotals = ({
  items,
  discountAmount,
  taxRate,
}: CartPricingInput): CartTotals => {
  const subtotalMinor = items.reduce(
    (sum, item) => sum + toMinor(item.unitPrice) * item.quantity,
    0,
  )
  const discountMinor = toMinor(discountAmount)
  const taxMinor = Math.round(((subtotalMinor - discountMinor) * taxRate) / 100) * 100

  return {
    subtotal: fromMinor(subtotalMinor),
    discountAmount: fromMinor(discountMinor),
    taxAmount: fromMinor(taxMinor),
    totalAmount: fromMinor(subtotalMinor - discountMinor + taxMinor),
  }
}

export const calculateCartChange = ({
  method,
  total,
  amountPaid,
}: {
  method: string
  total: number
  amountPaid: number
}): number => (method === 'CASH' ? Math.max(amountPaid - total, 0) : 0)
