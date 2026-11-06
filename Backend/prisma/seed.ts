import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { Prisma, PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import type { Role } from '@prisma/client'
import { env } from '../src/config/env.js'
import { todayInJakarta } from '../src/utils/date-range.js'
import { formatInvoiceNumber } from '../src/utils/invoice.js'
import { calculateChange, calculateTotals } from '../src/utils/pricing.js'
import { categories, products } from './seed-data/catalog.js'
import {
  adjustments,
  purchases,
  transactions,
  type SeedPaymentMethod,
  type SeedTransactionItem,
} from './seed-data/scenario.js'

type Tx = Prisma.TransactionClient
interface SeedUser {
  key: 'admin' | 'owner' | 'kasir1' | 'kasir2'
  name: string
  email: string
  password: string
  role: Role
}

/** Akun development (PRD §16.3). Password hanya untuk lokal, jangan dipakai di production. */
const users: SeedUser[] = [
  { key: 'admin', name: 'Andi Pratama', email: 'admin@pos.local', password: 'Admin@12345', role: 'ADMIN' },
  { key: 'owner', name: 'Rina Kusuma', email: 'owner@pos.local', password: 'Owner@12345', role: 'OWNER' },
  { key: 'kasir1', name: 'Siti Rahma', email: 'kasir1@pos.local', password: 'Kasir@12345', role: 'CASHIER' },
  { key: 'kasir2', name: 'Budi Santoso', email: 'kasir2@pos.local', password: 'Kasir@12345', role: 'CASHIER' },
]

interface SeedEvent {
  at: Date
  type: 'INITIAL_STOCK' | 'PURCHASE' | 'SALE' | 'ADJUSTMENT'
  sku?: string
  quantity?: number
  notes?: string
  transaction?: (typeof transactions)[number]
  items?: SeedTransactionItem[]
}

const pad = (value: number): string => String(value).padStart(2, '0')

/** Geser tanggal `YYYY-MM-DD` sebanyak `days` hari. */
const shiftDate = (iso: string, days: number): string => {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Waktu WIB (`+07:00`) untuk `daysAgo` hari yang lalu pada jam:menit WIB. */
const jakartaTime = (today: string, daysAgo: number, hour: number, minute: number): Date =>
  new Date(`${shiftDate(today, -daysAgo)}T${pad(hour)}:${pad(minute)}:00+07:00`)

const minutesBefore = (now: Date, minutes: number): Date =>
  new Date(now.getTime() - minutes * 60_000)

const buildEvents = (now: Date, today: string): SeedEvent[] => {
  const events: SeedEvent[] = []

  for (const product of products) {
    events.push({
      at: jakartaTime(today, 7, 8, 0),
      type: 'INITIAL_STOCK',
      sku: product.sku,
      quantity: product.initialStock,
      notes: 'Stok awal (data demo)',
    })
  }

  for (const purchase of purchases) {
    events.push({
      at: jakartaTime(today, purchase.daysAgo, purchase.hour, purchase.minute),
      type: 'PURCHASE',
      sku: purchase.sku,
      quantity: purchase.quantity,
      notes: purchase.notes,
    })
  }

  for (const adjustment of adjustments) {
    events.push({
      at: minutesBefore(now, adjustment.minutesBefore),
      type: 'ADJUSTMENT',
      sku: adjustment.sku,
      notes: adjustment.notes,
    })
  }

  for (const transaction of transactions) {
    const at =
      transaction.minutesBefore !== undefined
        ? minutesBefore(now, transaction.minutesBefore)
        : jakartaTime(today, transaction.daysAgo, transaction.hour ?? 0, transaction.minute ?? 0)

    events.push({ at, type: 'SALE', transaction, items: transaction.items })
  }

  return events.sort((a, b) => a.at.getTime() - b.at.getTime())
}

const insertTransaction = async (
  tx: Tx,
  event: SeedEvent,
  sequence: number,
  cashierId: string,
  taxRate: number,
  productBySku: Map<string, { id: string; sku: string; name: string; costPrice: Prisma.Decimal; sellingPrice: Prisma.Decimal }>,
  runningStock: Map<string, number>,
): Promise<void> => {
  const template = event.transaction!
  const items = event.items!

  const totals = calculateTotals({
    items: items.map((item) => {
      const product = productBySku.get(item.sku)!

      return {
        productId: product.id,
        quantity: item.qty,
        unitPrice: product.sellingPrice.toFixed(2),
        unitCost: product.costPrice.toFixed(2),
        discountAmount: '0.00',
      }
    }),
    discountAmount: template.discount.toFixed(2),
    taxRate,
  })

  const method: SeedPaymentMethod = template.method
  const total = Number(totals.totalAmount)
  const amountPaid = method === 'CASH' ? Math.ceil(total / 10_000) * 10_000 : total

  const created = await tx.transaction.create({
    data: {
      invoiceNumber: formatInvoiceNumber(sequence, event.at),
      idempotencyKey: randomUUID(),
      cashierId,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      paymentMethod: method,
      paymentReference: method === 'CASH' ? null : `DUMMY-${method}-${sequence}`,
      amountPaid: amountPaid.toFixed(2),
      changeAmount: calculateChange({
        method,
        total: totals.totalAmount,
        amountPaid: amountPaid.toFixed(2),
      }),
      createdAt: event.at,
    },
  })

  for (const [index, calculated] of totals.items.entries()) {
    const templateItem = items[index]!
    const product = productBySku.get(templateItem.sku)!

    await tx.transactionItem.create({
      data: {
        transactionId: created.id,
        productId: product.id,
        productNameSnapshot: product.name,
        productSkuSnapshot: product.sku,
        quantity: templateItem.qty,
        unitPrice: calculated.unitPrice,
        unitCost: calculated.unitCost,
        discountAmount: calculated.discountAmount,
        subtotal: calculated.subtotal,
      },
    })

    const before = runningStock.get(templateItem.sku)!
    const after = before - templateItem.qty
    runningStock.set(templateItem.sku, after)

    await tx.stockMovement.create({
      data: {
        productId: product.id,
        movementType: 'SALE',
        quantity: -templateItem.qty,
        stockBefore: before,
        stockAfter: after,
        referenceType: 'TRANSACTION',
        referenceId: created.id,
        notes: null,
        createdById: cashierId,
        createdAt: event.at,
      },
    })
  }
}

const verifyConsistency = async (tx: Tx): Promise<void> => {
  const movements = await tx.stockMovement.findMany({
    orderBy: [{ productId: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
  })

  const lastAfter = new Map<string, number>()
  const sumQuantity = new Map<string, number>()

  for (const movement of movements) {
    if (movement.stockAfter !== movement.stockBefore + movement.quantity) {
      throw new Error(`Movement ${movement.id}: stock_after != stock_before + quantity`)
    }

    const previous = lastAfter.get(movement.productId)
    if (previous !== undefined && movement.stockBefore !== previous) {
      throw new Error(`Movement ${movement.id}: rantai stok tidak menyambung`)
    }
    if (movement.stockAfter < 0) {
      throw new Error(`Movement ${movement.id}: stok negatif`)
    }

    lastAfter.set(movement.productId, movement.stockAfter)
    sumQuantity.set(movement.productId, (sumQuantity.get(movement.productId) ?? 0) + movement.quantity)
  }

  const productRows = await tx.product.findMany()
  for (const product of productRows) {
    if (product.stock !== lastAfter.get(product.id)) {
      throw new Error(`Produk ${product.sku}: stok != stock_after movement terakhir`)
    }
    if (product.stock !== (sumQuantity.get(product.id) ?? 0)) {
      throw new Error(`Produk ${product.sku}: stok != total quantity movement`)
    }
  }

  const saleMovements = movements.filter((movement) => movement.movementType === 'SALE')
  const saleByKey = new Map<string, number>()
  for (const movement of saleMovements) {
    const key = `${movement.referenceId}:${movement.productId}`
    saleByKey.set(key, (saleByKey.get(key) ?? 0) + 1)
  }

  const transactionRows = await tx.transaction.findMany({ include: { items: true } })
  let itemCount = 0

  for (const transaction of transactionRows) {
    const itemsSum = transaction.items.reduce(
      (sum, item) => sum.plus(item.subtotal),
      new Prisma.Decimal(0),
    )
    if (!itemsSum.equals(transaction.subtotal)) {
      throw new Error(`Transaksi ${transaction.invoiceNumber}: subtotal != Σ items.subtotal`)
    }

    const expectedTotal = transaction.subtotal
      .minus(transaction.discountAmount)
      .plus(transaction.taxAmount)
    if (!expectedTotal.equals(transaction.totalAmount)) {
      throw new Error(`Transaksi ${transaction.invoiceNumber}: total tidak sesuai rumus`)
    }

    const expectedChange = transaction.amountPaid.minus(transaction.totalAmount)
    if (!expectedChange.equals(transaction.changeAmount) || transaction.changeAmount.lessThan(0)) {
      throw new Error(`Transaksi ${transaction.invoiceNumber}: kembalian tidak valid`)
    }

    for (const item of transaction.items) {
      itemCount += 1
      const key = `${transaction.id}:${item.productId}`
      if (saleByKey.get(key) !== 1) {
        throw new Error(
          `Item ${item.id}: harus tepat satu movement SALE dengan quantity -${item.quantity}`,
        )
      }
    }
  }

  const duplicates = await tx.$queryRaw<Array<{ value: string }>>(Prisma.sql`
    SELECT sku AS value FROM products GROUP BY sku HAVING COUNT(*) > 1
    UNION ALL
    SELECT barcode FROM products WHERE barcode IS NOT NULL GROUP BY barcode HAVING COUNT(*) > 1
    UNION ALL
    SELECT email FROM users GROUP BY email HAVING COUNT(*) > 1
    UNION ALL
    SELECT invoice_number FROM transactions GROUP BY invoice_number HAVING COUNT(*) > 1
  `)

  if (duplicates.length > 0) {
    throw new Error(`Ada nilai duplikat: ${duplicates.map((row) => row.value).join(', ')}`)
  }

  const [userCount, categoryCount, productCount, transactionCount, movementCount] =
    await Promise.all([
      tx.user.count(),
      tx.category.count(),
      tx.product.count(),
      tx.transaction.count(),
      tx.stockMovement.count(),
    ])

  const expectedMovements =
    products.length + purchases.length + itemCount + adjustments.length

  if (userCount !== users.length || categoryCount !== categories.length) {
    throw new Error('Jumlah user atau kategori tidak sesuai')
  }
  if (productCount !== products.length || transactionCount !== transactions.length) {
    throw new Error('Jumlah produk atau transaksi tidak sesuai')
  }
  if (movementCount !== expectedMovements) {
    throw new Error(
      `Jumlah movement ${movementCount} tidak sama dengan perkiraan ${expectedMovements}`,
    )
  }
}

export interface SeedSummary {
  users: number
  categories: number
  products: number
  transactions: number
  movements: number
}

export const runSeed = async (client: PrismaClient): Promise<SeedSummary> => {
  const db = client

  if (env.NODE_ENV === 'production') {
    throw new Error('Seed ditolak: NODE_ENV=production. Seed hanya untuk development.')
  }

  const now = new Date()
  const today = todayInJakarta(now)
  const events = buildEvents(now, today)

  const passwordHashes = new Map<string, string>()
  for (const user of users) {
    passwordHashes.set(user.email, await bcrypt.hash(user.password, env.BCRYPT_SALT_ROUNDS))
  }

  let sequence = 0

  await db.$transaction(
    async (tx) => {
      await tx.stockMovement.deleteMany()
      await tx.transactionItem.deleteMany()
      await tx.transaction.deleteMany()
      await tx.product.deleteMany()
      await tx.category.deleteMany()
      await tx.user.deleteMany()

      const userIdByKey = new Map<string, string>()
      for (const user of users) {
        const created = await tx.user.create({
          data: {
            name: user.name,
            email: user.email,
            passwordHash: passwordHashes.get(user.email)!,
            role: user.role,
          },
        })
        userIdByKey.set(user.key, created.id)
      }

      const categoryIdByKey = new Map<string, string>()
      for (const category of categories) {
        const created = await tx.category.create({
          data: { name: category.name, description: category.description },
        })
        categoryIdByKey.set(category.key, created.id)
      }

      const productBySku = new Map<
        string,
        {
          id: string
          sku: string
          name: string
          costPrice: Prisma.Decimal
          sellingPrice: Prisma.Decimal
          minStock: number
        }
      >()

      for (const product of products) {
        const created = await tx.product.create({
          data: {
            sku: product.sku,
            barcode: product.barcode,
            name: product.name,
            categoryId: categoryIdByKey.get(product.categoryKey)!,
            unit: product.unit,
            costPrice: product.costPrice.toFixed(2),
            sellingPrice: product.sellingPrice.toFixed(2),
            stock: 0,
            minStock: product.minStock,
          },
        })
        productBySku.set(product.sku, {
          id: created.id,
          sku: created.sku,
          name: created.name,
          costPrice: created.costPrice,
          sellingPrice: created.sellingPrice,
          minStock: created.minStock,
        })
      }

      const runningStock = new Map<string, number>(
        products.map((product) => [product.sku, 0]),
      )
      const adminId = userIdByKey.get('admin')!

      for (const event of events) {
        if (event.type === 'SALE') {
          sequence += 1
          const cashierId =
            event.transaction!.cashier === 'kasir1'
              ? userIdByKey.get('kasir1')!
              : userIdByKey.get('kasir2')!

          await insertTransaction(
            tx,
            event,
            sequence,
            cashierId,
            env.TAX_RATE,
            productBySku,
            runningStock,
          )
          continue
        }

        const product = productBySku.get(event.sku!)!
        const before = runningStock.get(event.sku!)!
        const quantity =
          event.type === 'ADJUSTMENT'
            ? -(before - (product.minStock - 1))
            : event.quantity!
        const after = before + quantity
        runningStock.set(event.sku!, after)

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            movementType: event.type,
            quantity,
            stockBefore: before,
            stockAfter: after,
            referenceType: 'MANUAL',
            referenceId: null,
            notes: event.notes ?? null,
            createdById: adminId,
            createdAt: event.at,
          },
        })
      }

      for (const product of products) {
        await tx.product.update({
          where: { id: productBySku.get(product.sku)!.id },
          data: { stock: runningStock.get(product.sku)! },
        })
      }

      await tx.$queryRaw(Prisma.sql`SELECT setval('invoice_number_seq', ${sequence}, true)`)

      await verifyConsistency(tx)
    },
    { timeout: 120_000 },
  )

  const [userTotal, categoryTotal, productTotal, transactionTotal, movementTotal] =
    await Promise.all([
      db.user.count(),
      db.category.count(),
      db.product.count(),
      db.transaction.count(),
      db.stockMovement.count(),
    ])

  return {
    users: userTotal,
    categories: categoryTotal,
    products: productTotal,
    transactions: transactionTotal,
    movements: movementTotal,
  }
}

const printSummary = (summary: SeedSummary): void => {
  console.log('Seed selesai:')
  console.log(
    `  users=${summary.users} categories=${summary.categories} products=${summary.products}`,
  )
  console.log(`  transactions=${summary.transactions} movements=${summary.movements}`)
  console.log('Akun development:')
  for (const user of users) {
    console.log(`  ${user.role.padEnd(7)} ${user.email} / ${user.password}`)
  }
  console.log('Peringatan: akun dan password di atas hanya untuk development lokal.')
}

const invokedPath = process.argv[1]
const isDirectRun =
  invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href

if (isDirectRun) {
  const prisma = new PrismaClient()

  runSeed(prisma)
    .then(printSummary)
    .catch((error: unknown) => {
      console.error('Seed gagal:', error instanceof Error ? error.message : error)
      process.exitCode = 1
    })
    .finally(() => {
      void prisma.$disconnect()
    })
}
