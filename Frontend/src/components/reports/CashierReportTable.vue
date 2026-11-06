<script setup lang="ts">
import type { CashierReportRow } from '@/types/report'
import { formatNumber, formatRupiah } from '@/utils/format'

defineProps<{ items: CashierReportRow[] }>()
</script>

<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-border text-sm">
      <thead>
        <tr class="text-left text-xs uppercase tracking-wide text-ink-3">
          <th scope="col" class="px-4 py-3 font-medium">Kasir</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Transaksi</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Revenue</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Gross Profit</th>
          <th scope="col" class="hidden px-4 py-3 text-right font-medium sm:table-cell">
            Rata-rata
          </th>
        </tr>
      </thead>

      <tbody class="divide-y divide-border">
        <tr v-for="item in items" :key="item.cashier_id" class="hover:bg-surface-2">
          <td class="px-4 py-3 font-medium text-ink">{{ item.cashier_name }}</td>
          <td class="px-4 py-3 text-right tabular-nums text-ink-2">
            {{ formatNumber(item.transaction_count) }}
          </td>
          <td class="px-4 py-3 text-right tabular-nums font-semibold text-ink">
            {{ formatRupiah(item.revenue) }}
          </td>
          <td class="px-4 py-3 text-right tabular-nums text-ink">
            {{ formatRupiah(item.gross_profit) }}
          </td>
          <td class="hidden px-4 py-3 text-right tabular-nums text-ink-2 sm:table-cell">
            {{ formatRupiah(item.average_transaction) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
