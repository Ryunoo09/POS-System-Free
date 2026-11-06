<script setup lang="ts">
import { computed } from 'vue'
import type { PaymentMethodSales } from '@/types/dashboard'
import { PAYMENT_METHODS } from '@/utils/constants'
import { formatNumber, formatRupiah } from '@/utils/format'

const props = defineProps<{ items: PaymentMethodSales[] }>()

const RADIUS = 48
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const TONES = ['var(--color-accent)', 'var(--color-accent-mark)', '#5eead4', '#99f6e4']
const FALLBACK_TONE = 'var(--color-accent)'

const total = computed(() =>
  props.items.reduce((sum, item) => sum + Number(item.revenue), 0),
)

const compact = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 })

const compactTotal = computed(() => `Rp ${compact.format(total.value)}`)

const labelOf = (method: string): string =>
  PAYMENT_METHODS.find((item) => item.value === method)?.label ?? method

const segments = computed(() => {
  let offset = 0

  return props.items.map((item, index) => {
    const revenue = Number(item.revenue)
    const fraction = total.value > 0 ? revenue / total.value : 0
    const dash = fraction * CIRCUMFERENCE
    const segment = {
      ...item,
      label: labelOf(item.payment_method),
      revenue,
      fraction,
      dash,
      gap: CIRCUMFERENCE - dash,
      offset,
      tone: TONES[index % TONES.length] ?? FALLBACK_TONE,
    }

    offset += dash
    return segment
  })
})

const percentOf = (fraction: number): string =>
  `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(fraction * 100)}%`
</script>

<template>
  <div>
    <div class="flex flex-col items-center gap-4 xl:flex-row xl:items-center xl:gap-6">
    <div class="relative shrink-0">
      <svg viewBox="0 0 128 128" class="h-32 w-32" role="img" aria-label="Komposisi metode pembayaran">
        <circle cx="64" cy="64" :r="RADIUS" fill="none" class="stroke-surface-2" stroke-width="16" />
        <circle
          v-for="segment in segments"
          :key="segment.payment_method"
          cx="64"
          cy="64"
          :r="RADIUS"
          fill="none"
          :stroke="segment.tone"
          stroke-width="16"
          :stroke-dasharray="`${segment.dash} ${segment.gap}`"
          :stroke-dashoffset="-segment.offset"
          transform="rotate(-90 64 64)"
        >
          <title>{{ segment.label }}: {{ formatRupiah(segment.revenue) }}</title>
        </circle>
      </svg>

      <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span class="text-sm font-semibold text-ink tabular-nums">
          {{ compactTotal }}
        </span>
        <span class="text-[11px] text-ink-3">Total</span>
      </div>
    </div>

    <ul class="w-full min-w-0 space-y-2.5 xl:flex-1">
      <li
        v-for="segment in segments"
        :key="`legend-${segment.payment_method}`"
        class="flex items-center gap-2 text-sm"
      >
        <span
          class="h-2.5 w-2.5 shrink-0 rounded-full"
          :style="{ backgroundColor: segment.tone }"
          aria-hidden="true"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm leading-tight text-ink-2" :title="segment.label">
            {{ segment.label }}
          </p>
          <p class="mt-0.5 text-xs text-ink-3 tabular-nums">
            {{ percentOf(segment.fraction) }}
          </p>
        </div>
        <span class="shrink-0 text-xs font-medium text-ink tabular-nums">
          {{ formatRupiah(segment.revenue) }}
        </span>
      </li>
    </ul>
    </div>

    <p class="sr-only">
      {{ formatNumber(items.reduce((sum, item) => sum + item.transaction_count, 0)) }} transaksi
      pada {{ items.length }} metode pembayaran.
    </p>
  </div>
</template>