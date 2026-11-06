<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { PaymentMethod, TransactionSummary } from '@/types/transaction'
import { PAYMENT_METHODS } from '@/utils/constants'
import { formatDateTime, formatRupiah } from '@/utils/format'

defineProps<{ items: TransactionSummary[] }>()

const paymentLabel = (method: PaymentMethod): string =>
  PAYMENT_METHODS.find((item) => item.value === method)?.label ?? method
</script>

<template>
  <ul class="divide-y divide-border">
    <li v-for="item in items" :key="item.id" class="py-2 first:pt-0 last:pb-0">
      <div class="flex items-center justify-between gap-3">
        <RouterLink
          :to="`/transactions/${item.id}`"
          class="truncate text-sm font-medium text-ink hover:text-accent"
        >
          {{ item.invoice_number }}
        </RouterLink>
        <span class="shrink-0 text-sm font-semibold text-ink tabular-nums">
          {{ formatRupiah(item.total_amount) }}
        </span>
      </div>

      <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-3">
        <span>{{ item.cashier.name }}</span>
        <span aria-hidden="true">&middot;</span>
        <span>{{ paymentLabel(item.payment_method) }}</span>
        <span aria-hidden="true">&middot;</span>
        <span>{{ formatDateTime(item.created_at) }}</span>
      </div>
    </li>
  </ul>
</template>