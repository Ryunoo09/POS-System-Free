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
    <table class="min-w-full divide-y divide-border text-sm">
      <thead>
        <tr class="text-left text-xs uppercase tracking-wide text-ink-3">
          <th scope="col" class="px-4 py-3 font-medium">Invoice</th>
          <th scope="col" class="hidden px-4 py-3 font-medium md:table-cell">Waktu</th>
          <th scope="col" class="hidden px-4 py-3 font-medium lg:table-cell">Kasir</th>
          <th scope="col" class="hidden px-4 py-3 text-right font-medium sm:table-cell">Item</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Total</th>
          <th scope="col" class="hidden px-4 py-3 font-medium lg:table-cell">Metode</th>
          <th scope="col" class="px-4 py-3 font-medium">Status</th>
        </tr>
      </thead>

      <tbody class="divide-y divide-border">
        <tr
          v-for="item in items"
          :key="item.id"
          tabindex="0"
          class="cursor-pointer transition hover:bg-surface-2 focus-visible:bg-accent-soft focus-visible:outline-none"
          @click="emit('open', item.id)"
          @keydown.enter="emit('open', item.id)"
          @keydown.space.prevent="emit('open', item.id)"
        >
          <td class="px-4 py-3">
            <p class="font-medium text-ink">{{ item.invoice_number }}</p>
            <p class="mt-0.5 text-xs text-ink-3 md:hidden">
              {{ formatDateTime(item.created_at) }}
            </p>
          </td>
          <td class="hidden px-4 py-3 text-ink-2 md:table-cell">
            {{ formatDateTime(item.created_at) }}
          </td>
          <td class="hidden px-4 py-3 text-ink-2 lg:table-cell">{{ item.cashier.name }}</td>
          <td class="hidden px-4 py-3 text-right text-ink-2 sm:table-cell">
            {{ formatNumber(item.item_count) }}
          </td>
          <td class="px-4 py-3 text-right font-semibold text-ink">
            {{ formatRupiah(item.total_amount) }}
          </td>
          <td class="hidden px-4 py-3 text-ink-2 lg:table-cell">
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
