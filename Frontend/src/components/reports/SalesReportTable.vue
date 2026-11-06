<script setup lang="ts">
import type { SalesReportRow } from '@/types/report'
import { formatNumber, formatRupiah } from '@/utils/format'

defineProps<{ items: SalesReportRow[] }>()
</script>

<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-slate-200 text-sm">
      <thead>
        <tr class="text-left text-xs uppercase tracking-wide text-slate-500">
          <th scope="col" class="px-4 py-3 font-medium">Periode</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Transaksi</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Revenue</th>
          <th scope="col" class="hidden px-4 py-3 text-right font-medium sm:table-cell">COGS</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Gross Profit</th>
        </tr>
      </thead>

      <tbody class="divide-y divide-slate-100">
        <tr v-for="item in items" :key="item.period" class="hover:bg-slate-50">
          <td class="px-4 py-3 font-medium text-slate-900">{{ item.period_label }}</td>
          <td class="px-4 py-3 text-right tabular-nums text-slate-600">
            {{ formatNumber(item.transaction_count) }}
          </td>
          <td class="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
            {{ formatRupiah(item.revenue) }}
          </td>
          <td class="hidden px-4 py-3 text-right tabular-nums text-slate-600 sm:table-cell">
            {{ formatRupiah(item.cogs) }}
          </td>
          <td class="px-4 py-3 text-right tabular-nums text-slate-900">
            {{ formatRupiah(item.gross_profit) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
