<script setup lang="ts">
import AppBadge from '@/components/common/AppBadge.vue'
import type { StockMovement, StockMovementType } from '@/types/inventory'
import { formatDateTime, formatNumber } from '@/utils/format'

defineProps<{ items: StockMovement[] }>()

const typeLabels: Record<StockMovementType, string> = {
  INITIAL_STOCK: 'Stok Awal',
  PURCHASE: 'Pembelian',
  SALE: 'Penjualan',
  ADJUSTMENT: 'Penyesuaian',
  RETURN: 'Retur',
}

const typeTones: Record<StockMovementType, 'success' | 'neutral' | 'warning' | 'danger'> = {
  INITIAL_STOCK: 'success',
  PURCHASE: 'success',
  SALE: 'neutral',
  ADJUSTMENT: 'warning',
  RETURN: 'success',
}

const signedQuantity = (quantity: number): string =>
  quantity > 0 ? `+${formatNumber(quantity)}` : formatNumber(quantity)

const referenceLabel = (movement: StockMovement): string => {
  if (movement.reference_type === 'MANUAL') return 'Manual'
  if (movement.reference_type === 'PRODUCT') return 'Produk'
  return movement.invoice_number ?? 'Transaksi'
}

const hasInvoice = (movement: StockMovement): boolean =>
  movement.reference_type === 'TRANSACTION' &&
  Boolean(movement.reference_id) &&
  Boolean(movement.invoice_number)

const quantityClass = (quantity: number): string =>
  quantity > 0 ? 'text-accent' : 'text-negative'
</script>

<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-border text-sm">
      <thead>
        <tr class="text-left text-xs uppercase tracking-wide text-ink-3">
          <th scope="col" class="px-4 py-3 font-medium">Waktu</th>
          <th scope="col" class="px-4 py-3 font-medium">Produk</th>
          <th scope="col" class="px-4 py-3 font-medium">Tipe</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Qty</th>
          <th scope="col" class="px-4 py-3 font-medium">Stok</th>
          <th scope="col" class="hidden px-4 py-3 font-medium lg:table-cell">Referensi</th>
          <th scope="col" class="hidden px-4 py-3 font-medium xl:table-cell">Oleh</th>
          <th scope="col" class="hidden px-4 py-3 font-medium xl:table-cell">Catatan</th>
        </tr>
      </thead>

      <tbody class="divide-y divide-border">
        <tr v-for="movement in items" :key="movement.id" class="hover:bg-surface-2">
          <td class="whitespace-nowrap px-4 py-3 text-ink-2">
            {{ formatDateTime(movement.created_at) }}
          </td>
          <td class="px-4 py-3">
            <p class="font-medium text-ink">{{ movement.product.name }}</p>
            <p class="text-xs text-ink-3">{{ movement.product.sku }}</p>
          </td>
          <td class="px-4 py-3">
            <AppBadge :tone="typeTones[movement.movement_type]">
              {{ typeLabels[movement.movement_type] }}
            </AppBadge>
          </td>
          <td
            class="whitespace-nowrap px-4 py-3 text-right font-medium"
            :class="quantityClass(movement.quantity)"
          >
            {{ signedQuantity(movement.quantity) }}
          </td>
          <td class="whitespace-nowrap px-4 py-3 text-ink-2">
            {{ formatNumber(movement.stock_before) }} → {{ formatNumber(movement.stock_after) }}
          </td>
          <td class="hidden px-4 py-3 lg:table-cell">
            <RouterLink
              v-if="hasInvoice(movement)"
              :to="`/transactions/${movement.reference_id}`"
              class="font-medium text-accent hover:text-accent hover:underline"
            >
              {{ referenceLabel(movement) }}
            </RouterLink>
            <span v-else class="text-ink-3">{{ referenceLabel(movement) }}</span>
          </td>
          <td class="hidden px-4 py-3 text-ink-2 xl:table-cell">
            {{ movement.created_by.name }}
          </td>
          <td class="hidden max-w-[16rem] truncate px-4 py-3 text-ink-3 xl:table-cell" :title="movement.notes ?? ''">
            {{ movement.notes ?? '—' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>