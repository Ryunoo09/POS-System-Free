<script setup lang="ts">
import type { TopProduct } from '@/types/dashboard'
import { formatNumber, formatRupiah } from '@/utils/format'

defineProps<{ items: TopProduct[] }>()
</script>

<template>
  <ol class="space-y-3">
    <li v-for="(item, index) in items" :key="item.product_id" class="flex items-center gap-3">
      <span
        class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-ink-2 tabular-nums"
      >
        {{ index + 1 }}
      </span>

      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-ink" :title="item.name">{{ item.name }}</p>
        <p class="text-xs text-ink-3">
          {{ item.sku }} &middot; {{ formatNumber(item.quantity_sold) }} terjual
        </p>
      </div>

      <span class="shrink-0 text-sm font-medium text-ink tabular-nums">
        {{ formatRupiah(item.revenue) }}
      </span>
    </li>
  </ol>
</template>