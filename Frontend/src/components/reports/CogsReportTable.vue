<script setup lang="ts">
import type { CategoryCogsRow } from '@/types/report'
import { formatNumber, formatRupiah } from '@/utils/format'

defineProps<{ items: CategoryCogsRow[] }>()
</script>

<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-border text-sm">
      <thead>
        <tr class="text-left text-xs uppercase tracking-wide text-ink-3">
          <th scope="col" class="px-4 py-3 font-medium">Kategori</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Qty</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Revenue</th>
          <th scope="col" class="hidden px-4 py-3 text-right font-medium sm:table-cell">COGS</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Gross Profit</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Margin</th>
        </tr>
      </thead>

      <tbody class="divide-y divide-border">
        <tr v-for="item in items" :key="item.category_id ?? 'none'" class="hover:bg-surface-2">
          <td class="px-4 py-3 font-medium text-ink">{{ item.category }}</td>
          <td class="px-4 py-3 text-right tabular-nums text-ink-2">
            {{ formatNumber(item.quantity_sold) }}
          </td>
          <td class="px-4 py-3 text-right tabular-nums text-ink">
            {{ formatRupiah(item.revenue) }}
          </td>
          <td class="hidden px-4 py-3 text-right tabular-nums text-ink-2 sm:table-cell">
            {{ formatRupiah(item.cogs) }}
          </td>
          <td class="px-4 py-3 text-right tabular-nums text-ink">
            {{ formatRupiah(item.gross_profit) }}
          </td>
          <td class="px-4 py-3 text-right tabular-nums text-ink-2">
            {{ formatNumber(item.gross_margin_pct) }}%
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>