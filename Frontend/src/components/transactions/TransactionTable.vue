<script setup lang="ts">
import AppBadge from '@/components/common/AppBadge.vue'
import type { TransactionSummary } from '@/types/transaction'
import { formatDateTime, formatNumber, formatRupiah } from '@/utils/format'
import {
  paymentMethodLabel,
  transactionStatusLabel,
  transactionStatusTone,
} from '@/utils/transactions'

defineProps<{ items: TransactionSummary[] }>()

const emit = defineEmits<{ open: [id: string] }>()
</script>

<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-slate-200 text-sm">
      <thead>
        <tr class="text-left text-xs uppercase tracking-wide text-slate-500">
          <th scope="col" class="px-4 py-3 font-medium">Invoice</th>
          <th scope="col" class="hidden px-4 py-3 font-medium md:table-cell">Waktu</th>
          <th scope="col" class="hidden px-4 py-3 font-medium lg:table-cell">Kasir</th>
          <th scope="col" class="hidden px-4 py-3 text-right font-medium sm:table-cell">Item</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Total</th>
          <th scope="col" class="hidden px-4 py-3 font-medium lg:table-cell">Metode</th>
          <th scope="col" class="px-4 py-3 font-medium">Status</th>
        </tr>
      </thead>

      <tbody class="divide-y divide-slate-100">
        <tr
          v-for="item in items"
          :key="item.id"
          tabindex="0"
          class="cursor-pointer transition hover:bg-slate-50 focus:bg-brand-50 focus:outline-none"
          @click="emit('open', item.id)"
          @keydown.enter="emit('open', item.id)"
        >
          <td class="px-4 py-3">
            <p class="font-medium text-slate-900">{{ item.invoice_number }}</p>
            <p class="mt-0.5 text-xs text-slate-500 md:hidden">
              {{ formatDateTime(item.created_at) }}
            </p>
          </td>
          <td class="hidden px-4 py-3 text-slate-600 md:table-cell">
            {{ formatDateTime(item.created_at) }}
          </td>
          <td class="hidden px-4 py-3 text-slate-600 lg:table-cell">{{ item.cashier.name }}</td>
          <td class="hidden px-4 py-3 text-right text-slate-600 sm:table-cell">
            {{ formatNumber(item.item_count) }}
          </td>
          <td class="px-4 py-3 text-right font-semibold text-slate-900">
            {{ formatRupiah(item.total_amount) }}
          </td>
          <td class="hidden px-4 py-3 text-slate-600 lg:table-cell">
            {{ paymentMethodLabel(item.payment_method) }}
          </td>
          <td class="px-4 py-3">
            <AppBadge :tone="transactionStatusTone(item.status)">
              {{ transactionStatusLabel(item.status) }}
            </AppBadge>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
