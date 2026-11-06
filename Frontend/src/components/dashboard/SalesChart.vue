<script setup lang="ts">
import { computed } from 'vue'
import type { DailySales } from '@/types/dashboard'
import { formatDate, formatRupiah } from '@/utils/format'

const props = defineProps<{ data: DailySales[] }>()

const WIDTH = 640
const HEIGHT = 240
const PADDING = { top: 16, right: 16, bottom: 32, left: 56 }
const innerWidth = WIDTH - PADDING.left - PADDING.right
const innerHeight = HEIGHT - PADDING.top - PADDING.bottom

const compact = new Intl.NumberFormat('id-ID', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const compactCurrency = (value: number): string => `Rp ${compact.format(value)}`

const maxValue = computed(() => Math.max(...props.data.map((row) => Number(row.revenue)), 1))

const points = computed(() =>
  props.data.map((row, index) => {
    const x =
      PADDING.left +
      (props.data.length <= 1 ? innerWidth / 2 : (index / (props.data.length - 1)) * innerWidth)
    const y = PADDING.top + innerHeight - (Number(row.revenue) / maxValue.value) * innerHeight

    return { ...row, x, y }
  }),
)

const linePath = computed(() =>
  points.value
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' '),
)

const areaPath = computed(() => {
  const first = points.value[0]
  const last = points.value[points.value.length - 1]

  if (!first || !last) return ''

  const baseline = PADDING.top + innerHeight
  return `${linePath.value} L ${last.x.toFixed(1)} ${baseline} L ${first.x.toFixed(1)} ${baseline} Z`
})

const gridLines = computed(() =>
  [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    y: PADDING.top + innerHeight - ratio * innerHeight,
    label: compactCurrency(maxValue.value * ratio),
  })),
)

const xLabels = computed(() => {
  if (points.value.length === 0) return []

  const indexes = new Set([
    0,
    Math.floor((points.value.length - 1) / 2),
    points.value.length - 1,
  ])

  return [...indexes].flatMap((index) => {
    const point = points.value[index]
    return point ? [point] : []
  })
})
</script>

<template>
  <div class="w-full">
    <svg
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      class="h-auto w-full text-brand-600"
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
          class="stroke-slate-200"
          stroke-width="1"
        />
        <text
          v-for="line in gridLines"
          :key="`grid-label-${line.y}`"
          :x="PADDING.left - 8"
          :y="line.y + 4"
          text-anchor="end"
          class="fill-slate-400 text-[10px]"
        >
          {{ line.label }}
        </text>
      </g>

      <path :d="areaPath" fill="currentColor" opacity="0.12" />
      <path
        :d="linePath"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <circle
        v-for="point in points"
        :key="point.date"
        :cx="point.x"
        :cy="point.y"
        r="3"
        fill="currentColor"
      >
        <title>{{ formatDate(point.date) }}: {{ formatRupiah(point.revenue) }}</title>
      </circle>

      <text
        v-for="point in xLabels"
        :key="`x-${point.date}`"
        :x="point.x"
        :y="HEIGHT - 8"
        text-anchor="middle"
        class="fill-slate-400 text-[10px]"
      >
        {{ point.date.slice(5) }}
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