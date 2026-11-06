<script setup lang="ts">
import { computed } from 'vue'
import type { DailySales } from '@/types/dashboard'
import { formatDate, formatRupiah } from '@/utils/format'

const props = defineProps<{ data: DailySales[] }>()

const WIDTH = 720
const HEIGHT = 248
const PADDING = { top: 24, right: 8, bottom: 30, left: 72 }
const innerWidth = WIDTH - PADDING.left - PADDING.right
const innerHeight = HEIGHT - PADDING.top - PADDING.bottom

const compact = new Intl.NumberFormat('id-ID', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const compactCurrency = (value: number): string => `Rp ${compact.format(value)}`

const maxValue = computed(() => Math.max(...props.data.map((row) => Number(row.revenue)), 1))

const slotWidth = computed(() => innerWidth / Math.max(props.data.length, 1))
const barWidth = computed(() => Math.max(2, Math.min(slotWidth.value * 0.62, 32)))

const bars = computed(() =>
  props.data.map((row, index) => {
    const revenue = Number(row.revenue)
    const height = (revenue / maxValue.value) * innerHeight
    const x = PADDING.left + index * slotWidth.value + (slotWidth.value - barWidth.value) / 2
    const y = PADDING.top + innerHeight - height

    return { ...row, revenue, x, y, height }
  }),
)

const peakIndex = computed(() => {
  let index = 0

  bars.value.forEach((bar, current) => {
    if (bar.revenue > (bars.value[index]?.revenue ?? 0)) index = current
  })

  return index
})

const gridLines = computed(() =>
  [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    y: PADDING.top + innerHeight - ratio * innerHeight,
    label: compactCurrency(maxValue.value * ratio),
  })),
)

const xLabels = computed(() => {
  const total = bars.value.length
  if (total === 0) return []

  if (total <= 5) return bars.value

  const indexes = new Set([
    0,
    Math.round((total - 1) / 4),
    Math.round((total - 1) / 2),
    Math.round(((total - 1) * 3) / 4),
    total - 1,
  ])

  return [...indexes].flatMap((index) => {
    const bar = bars.value[index]
    return bar ? [bar] : []
  })
})

const shortDate = (value: string): string =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' })
    .format(new Date(`${value}T00:00:00+07:00`))
    .replace('.', '')
</script>

<template>
  <div class="w-full min-w-0 overflow-x-auto">
    <svg
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      class="h-auto w-full min-w-[600px]"
      role="img"
      aria-label="Grafik penjualan harian"
    >
      <g>
        <line
          v-for="line in gridLines"
          :key="`grid-${line.y}`"
          :x1="PADDING.left"
          :x2="WIDTH - PADDING.right"
          :y1="line.y"
          :y2="line.y"
          class="stroke-border"
          stroke-width="1"
        />
        <text
          v-for="line in gridLines"
          :key="`grid-label-${line.y}`"
          :x="PADDING.left - 8"
          :y="line.y + 4"
          text-anchor="end"
          class="fill-ink-3 text-[10px]"
        >
          {{ line.label }}
        </text>
      </g>

      <rect
        v-for="(bar, index) in bars"
        :key="bar.date"
        :x="bar.x"
        :y="bar.y"
        :width="barWidth"
        :height="bar.height"
        rx="2"
        :class="index === peakIndex ? 'fill-accent' : 'fill-accent-mark'"
        :opacity="index === peakIndex ? 1 : 0.85"
      >
        <title>{{ formatDate(bar.date) }}: {{ formatRupiah(bar.revenue) }}</title>
      </rect>

      <text
        v-for="bar in xLabels"
        :key="`x-${bar.date}`"
        :x="bar.x + barWidth / 2"
        :y="HEIGHT - 10"
        text-anchor="middle"
        class="fill-ink-3 text-[10px]"
      >
        {{ shortDate(bar.date) }}
      </text>
    </svg>

    <table class="sr-only">
      <caption>
        Data penjualan harian
      </caption>
      <thead>
        <tr>
          <th scope="col">Tanggal</th>
          <th scope="col">Penjualan</th>
          <th scope="col">Transaksi</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in data" :key="row.date">
          <td>{{ formatDate(row.date) }}</td>
          <td>{{ formatRupiah(row.revenue) }}</td>
          <td>{{ row.transaction_count }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>