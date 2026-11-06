<script setup lang="ts">
import type { ProductReportRow } from '@/types/report'
import { formatNumber, formatRupiah } from '@/utils/format'

defineProps<{ items: ProductReportRow[] }>()
</script>

<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-border text-sm">
      <thead>
        <tr class="text-left text-xs uppercase tracking-wide text-ink-3">
          <th scope="col" class="px-4 py-3 font-medium">Produk</th>
          <th scope="col" class="hidden px-4 py-3 font-medium md:table-cell">Kategori</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Qty</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Revenue</th>
          <th scope="col" class="hidden px-4 py-3 text-right font-medium sm:table-cell">COGS</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Gross Profit</th>
        </tr>
      </thead>

      <tbody class="divide-y divide-border">
        <tr v-for="item in items" :key="item.product_id" class="hover:bg-surface-2">
          <td class="px-4 py-3">
            <p class="font-medium text-ink">{{ item.name }}</p>
            <p class="mt-0.5 text-xs text-ink-3">{{ item.sku }}</p>
          </td>
          <td class="hidden px-4 py-3 text-ink-2 md:table-cell">
            {{ item.category ?? '—' }}
          </td>
          <td class="px-4 py-3 text-right tabular-nums text-ink-2">
            {{ formatNumber(item.quantity_sold) }}
          </td>
          <td class="px-4 py-3 text-right tabular-nums font-semibold text-ink">
            {{ formatRupiah(item.revenue) }}
          </td>
          <td class="hidden px-4 py-3 text-right tabular-nums text-ink-2 sm:table-cell">
            {{ formatRupiah(item.cogs) }}
          </td>
          <td class="px-4 py-3 text-right tabular-nums text-ink">
            {{ formatRupiah(item.gross_profit) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
