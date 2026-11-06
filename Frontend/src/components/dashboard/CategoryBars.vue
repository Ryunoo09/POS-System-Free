<script setup lang="ts">
import { computed } from 'vue'
import type { CategorySales } from '@/types/dashboard'
import { formatRupiah } from '@/utils/format'

const props = defineProps<{ items: CategorySales[] }>()

const MAX_ROWS = 6

const rows = computed(() => {
  const sorted = [...props.items].sort((a, b) => Number(b.revenue) - Number(a.revenue))
  const top = sorted.slice(0, MAX_ROWS)
  const rest = sorted.slice(MAX_ROWS)

  const display = top.map((item) => ({
    key: item.category_id ?? 'uncategorized',
    label: item.category,
    revenue: Number(item.revenue),
  }))

  if (rest.length > 0) {
    display.push({
      key: 'rest',
      label: `Lainnya (${rest.length} kategori)`,
      revenue: rest.reduce((sum, item) => sum + Number(item.revenue), 0),
    })
  }

  const max = Math.max(...display.map((row) => row.revenue), 1)

  return display.map((row) => ({ ...row, percent: (row.revenue / max) * 100 }))
})
</script>

<template>
  <ul class="space-y-3">
    <li v-for="row in rows" :key="row.key">
      <div class="flex items-baseline justify-between gap-3">
        <span class="truncate text-sm text-ink-2" :title="row.label">{{ row.label }}</span>
        <span class="shrink-0 text-sm font-medium text-ink tabular-nums">
          {{ formatRupiah(row.revenue) }}
        </span>
      </div>
      <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          class="h-full rounded-full bg-accent-mark"
          :style="{ width: `${Math.max(row.percent, 2)}%` }"
        />
      </div>
    </li>
  </ul>
</template>