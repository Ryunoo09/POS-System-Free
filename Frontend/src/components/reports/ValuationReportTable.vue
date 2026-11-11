<script setup lang="ts">
import type { ValuationItemRow } from '@/types/report'
import { formatNumber, formatRupiah } from '@/utils/format'

defineProps<{ items: ValuationItemRow[] }>()
</script>

<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-border text-sm">
      <thead>
        <tr class="text-left text-xs uppercase tracking-wide text-ink-3">
          <th scope="col" class="px-4 py-3 font-medium">Produk</th>
          <th scope="col" class="hidden px-4 py-3 font-medium md:table-cell">Kategori</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Stok</th>
          <th scope="col" class="hidden px-4 py-3 text-right font-medium sm:table-cell">Rata-rata</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Nilai Stok</th>
        </tr>
      </thead>

      <tbody class="divide-y divide-border">
        <tr v-for="item in items" :key="item.product_id" class="hover:bg-surface-2">
          <td class="px-4 py-3">
            <p class="font-medium text-ink">{{ item.name }}</p>
            <p class="mt-0.5 text-xs text-ink-3">{{ item.sku }}</p>
          </td>
          <td class="hidden px-4 py-3 text-ink-2 md:table-cell">{{ item.category }}</td>
          <td class="px-4 py-3 text-right tabular-nums text-ink-2">
            {{ formatNumber(item.stock) }}
          </td>
          <td class="hidden px-4 py-3 text-right tabular-nums text-ink-2 sm:table-cell">
            {{ formatRupiah(item.average_cost) }}
          </td>
          <td class="px-4 py-3 text-right tabular-nums font-semibold text-ink">
            {{ formatRupiah(item.inventory_value) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
