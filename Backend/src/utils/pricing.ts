import type { PaymentMethod } from '../constants/transactions.js'

/**
 * Uang dihitung dalam satuan sen (integer) agar pembulatan tidak terpengaruh
 * galat floating point. Nilai desimal dari database selalu 2 angka di belakang koma.
 */
const MINOR_FACTOR = 100

const toMinor = (value: string): number => {
  const [whole = '0', fraction = ''] = value.trim().split('.')
  const sign = whole.startsWith('-') ? -1 : 1
  const wholeDigits = whole.replace('-', '')
  const minor = Number(wholeDigits) * MINOR_FACTOR + Number((fraction + '00').slice(0, 2))

  return sign * minor
}

const fromMinor = (minor: number): string => {
  const sign = minor < 0 ? '-' : ''
  const absolute = Math.abs(minor)

  return `${sign}${Math.floor(absolute / MINOR_FACTOR)}.${String(absolute % MINOR_FACTOR).padStart(2, '0')}`
}

export interface PricingItemInput {
  productId: string
  quantity: number
  unitPrice: string
  unitCost: string
  discountAmount: string
}

export interface CalculatedItem extends PricingItemInput {
  subtotal: string
}

export interface CalculateTotalsInput {
  items: PricingItemInput[]
  discountAmount: string
  taxRate: number
}

export interface CalculatedTotals {
  subtotal: string
  discountAmount: string
  taxAmount: string
  totalAmount: string
  items: CalculatedItem[]
}

/**
 * Rumus otoritatif checkout (BR-024): subtotal per baris = harga × qty − diskon;
 * pajak = ROUND_HALF_UP((subtotal − diskon) × tarif) ke Rupiah penuh;
 * total = subtotal − diskon + pajak.
 */
export const calculateTotals = ({
  items,
  discountAmount,
  taxRate,
}: CalculateTotalsInput): CalculatedTotals => {
  const calculatedItems = items.map((item) => ({
    ...item,
    subtotal: fromMinor(
      toMinor(item.unitPrice) * item.quantity - toMinor(item.discountAmount),
    ),
  }))

  const subtotalMinor = calculatedItems.reduce(
    (sum, item) => sum + toMinor(item.subtotal),
    0,
  )
  const discountMinor = toMinor(discountAmount)
  const taxAmountMinor =
    Math.round(((subtotalMinor - discountMinor) * taxRate) / MINOR_FACTOR) * MINOR_FACTOR
  const totalMinor = subtotalMinor - discountMinor + taxAmountMinor

  return {
    subtotal: fromMinor(subtotalMinor),
    discountAmount: fromMinor(discountMinor),
    taxAmount: fromMinor(taxAmountMinor),
    totalAmount: fromMinor(totalMinor),
    items: calculatedItems,
  }
}

export interface CalculateChangeInput {
  method: PaymentMethod
  total: string
  amountPaid: string
}

/** Kembalian hanya untuk tunai; non-tunai wajib pas sehingga kembalian nol. */
export const calculateChange = ({
  method,
  total,
  amountPaid,
}: CalculateChangeInput): string => {
  if (method !== 'CASH') return fromMinor(0)

  return fromMinor(toMinor(amountPaid) - toMinor(total))
}
