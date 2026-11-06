/**
 * Skenario transaksi dan movement tambahan (PRD §16.6–16.7).
 * `created_at` ditentukan `seed.ts` dari hari seed dan jam WIB di sini.
 */

export type SeedPaymentMethod = 'CASH' | 'QRIS' | 'DEBIT_CARD' | 'BANK_TRANSFER'

export interface SeedTransactionItem {
  sku: string
  qty: number
}

export interface SeedTransaction {
  cashier: 'kasir1' | 'kasir2'
  /** Jumlah hari sebelum hari seed (0 = hari ini). */
  daysAgo: number
  /** Jam WIB (0–23); dipakai bila `minutesBefore` tidak diisi. */
  hour?: number
  minute?: number
  /** Untuk H-0: menit sebelum waktu seed dijalankan. */
  minutesBefore?: number
  method: SeedPaymentMethod
  discount: number
  items: SeedTransactionItem[]
}

export const transactions: SeedTransaction[] = [
  { cashier: 'kasir1', daysAgo: 6, hour: 8, minute: 15, method: 'CASH', discount: 0, items: [{ sku: 'MKN-002', qty: 5 }, { sku: 'MNM-003', qty: 4 }] },
  { cashier: 'kasir2', daysAgo: 6, hour: 10, minute: 40, method: 'CASH', discount: 0, items: [{ sku: 'MKN-001', qty: 1 }, { sku: 'MKN-004', qty: 2 }, { sku: 'MKN-005', qty: 1 }] },
  { cashier: 'kasir1', daysAgo: 6, hour: 14, minute: 5, method: 'QRIS', discount: 0, items: [{ sku: 'MNM-001', qty: 6 }, { sku: 'SNK-001', qty: 2 }] },
  { cashier: 'kasir2', daysAgo: 5, hour: 9, minute: 20, method: 'CASH', discount: 0, items: [{ sku: 'MKN-003', qty: 2 }, { sku: 'MKN-002', qty: 10 }, { sku: 'MNM-002', qty: 3 }] },
  { cashier: 'kasir1', daysAgo: 5, hour: 13, minute: 30, method: 'DEBIT_CARD', discount: 0, items: [{ sku: 'RTG-001', qty: 1 }, { sku: 'RTG-002', qty: 2 }, { sku: 'PCR-001', qty: 3 }] },
  { cashier: 'kasir2', daysAgo: 5, hour: 18, minute: 10, method: 'CASH', discount: 5_000, items: [{ sku: 'SNK-002', qty: 4 }, { sku: 'SNK-005', qty: 2 }, { sku: 'MNM-004', qty: 6 }] },
  { cashier: 'kasir1', daysAgo: 4, hour: 8, minute: 50, method: 'CASH', discount: 0, items: [{ sku: 'MKN-006', qty: 3 }, { sku: 'MKN-002', qty: 6 }, { sku: 'MNM-003', qty: 6 }] },
  { cashier: 'kasir2', daysAgo: 4, hour: 12, minute: 25, method: 'BANK_TRANSFER', discount: 0, items: [{ sku: 'PCR-003', qty: 2 }, { sku: 'PCR-004', qty: 2 }, { sku: 'PCR-002', qty: 1 }] },
  { cashier: 'kasir1', daysAgo: 3, hour: 9, minute: 5, method: 'CASH', discount: 10_000, items: [{ sku: 'MKN-001', qty: 2 }, { sku: 'MKN-004', qty: 3 }, { sku: 'MKN-005', qty: 2 }, { sku: 'MKN-003', qty: 1 }] },
  { cashier: 'kasir2', daysAgo: 3, hour: 15, minute: 45, method: 'QRIS', discount: 0, items: [{ sku: 'MNM-005', qty: 4 }, { sku: 'MNM-001', qty: 6 }, { sku: 'SNK-004', qty: 3 }] },
  { cashier: 'kasir1', daysAgo: 3, hour: 19, minute: 20, method: 'CASH', discount: 0, items: [{ sku: 'RTG-003', qty: 1 }, { sku: 'RTG-004', qty: 2 }, { sku: 'RTG-006', qty: 2 }] },
  { cashier: 'kasir2', daysAgo: 2, hour: 8, minute: 35, method: 'CASH', discount: 0, items: [{ sku: 'MKN-002', qty: 8 }, { sku: 'MNM-003', qty: 8 }, { sku: 'SNK-006', qty: 5 }] },
  { cashier: 'kasir1', daysAgo: 2, hour: 11, minute: 10, method: 'CASH', discount: 0, items: [{ sku: 'MNM-006', qty: 2 }, { sku: 'MKN-005', qty: 1 }] },
  { cashier: 'kasir2', daysAgo: 2, hour: 16, minute: 0, method: 'QRIS', discount: 0, items: [{ sku: 'SNK-001', qty: 3 }, { sku: 'SNK-003', qty: 3 }, { sku: 'MNM-002', qty: 4 }] },
  { cashier: 'kasir1', daysAgo: 1, hour: 9, minute: 45, method: 'DEBIT_CARD', discount: 0, items: [{ sku: 'RTG-005', qty: 1 }, { sku: 'RTG-001', qty: 1 }, { sku: 'RTG-002', qty: 1 }] },
  { cashier: 'kasir2', daysAgo: 1, hour: 13, minute: 15, method: 'CASH', discount: 0, items: [{ sku: 'PCR-005', qty: 2 }, { sku: 'PCR-006', qty: 2 }, { sku: 'PCR-001', qty: 4 }] },
  { cashier: 'kasir1', daysAgo: 1, hour: 17, minute: 40, method: 'CASH', discount: 5_000, items: [{ sku: 'MKN-001', qty: 1 }, { sku: 'MKN-002', qty: 5 }, { sku: 'MKN-003', qty: 2 }, { sku: 'MKN-004', qty: 1 }] },
  { cashier: 'kasir2', daysAgo: 0, minutesBefore: 60, method: 'CASH', discount: 0, items: [{ sku: 'MNM-001', qty: 4 }, { sku: 'MNM-004', qty: 4 }, { sku: 'SNK-002', qty: 2 }] },
  { cashier: 'kasir1', daysAgo: 0, minutesBefore: 40, method: 'QRIS', discount: 0, items: [{ sku: 'PCR-002', qty: 1 }, { sku: 'PCR-003', qty: 1 }, { sku: 'PCR-001', qty: 2 }, { sku: 'RTG-004', qty: 1 }] },
  { cashier: 'kasir2', daysAgo: 0, minutesBefore: 20, method: 'CASH', discount: 0, items: [{ sku: 'MKN-006', qty: 2 }, { sku: 'MKN-002', qty: 4 }, { sku: 'MNM-003', qty: 5 }, { sku: 'SNK-006', qty: 4 }] },
]

export interface SeedPurchase {
  sku: string
  daysAgo: number
  hour: number
  minute: number
  quantity: number
  notes: string
}

export const purchases: SeedPurchase[] = [
  { sku: 'MKN-002', daysAgo: 5, hour: 7, minute: 30, quantity: 100, notes: 'Pembelian dari supplier (dummy)' },
  { sku: 'MNM-001', daysAgo: 3, hour: 7, minute: 30, quantity: 48, notes: 'Pembelian dari supplier (dummy)' },
]

export interface SeedAdjustment {
  sku: string
  daysAgo: 0
  minutesBefore: number
  notes: string
}

export const adjustments: SeedAdjustment[] = [
  { sku: 'MNM-006', daysAgo: 0, minutesBefore: 90, notes: 'Koreksi stock opname (data demo)' },
  { sku: 'RTG-005', daysAgo: 0, minutesBefore: 90, notes: 'Koreksi stock opname (data demo)' },
  { sku: 'PCR-005', daysAgo: 0, minutesBefore: 90, notes: 'Koreksi stock opname (data demo)' },
]
