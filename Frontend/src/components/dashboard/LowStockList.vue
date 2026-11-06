<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppBadge from '@/components/common/AppBadge.vue'
import type { Product } from '@/types/product'
import { formatNumber } from '@/utils/format'

defineProps<{ items: Product[] }>()
</script>

<template>
  <ul class="divide-y divide-border">
    <li
      v-for="item in items"
      :key="item.id"
      class="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
    >
      <div class="min-w-0">
        <RouterLink
          :to="{ path: '/inventory', query: { search: item.sku } }"
          class="block truncate text-sm font-medium text-ink hover:text-accent"
          :title="item.name"
        >
          {{ item.name }}
        </RouterLink>
        <p class="truncate text-xs text-ink-3">{{ item.sku }} &middot; {{ item.category.name }}</p>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <span class="text-sm text-ink-2 tabular-nums">
          {{ formatNumber(item.stock) }}/{{ formatNumber(item.min_stock) }}
        </span>
        <AppBadge tone="warning">Rendah</AppBadge>
      </div>
    </li>
  </ul>
</template>