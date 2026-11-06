<script setup lang="ts">
defineProps<{
  items: ReadonlyArray<{
    label: string
    value: string
    hint?: string
    delta?: { current: number; previous: number }
  }>
}>()

const deltaOf = (
  delta: { current: number; previous: number } | undefined,
): { text: string; tone: string } | null => {
  if (!delta) return null

  if (delta.previous === 0) {
    if (delta.current === 0) return null
    return { text: 'Baru', tone: 'text-accent' }
  }

  const percent = ((delta.current - delta.previous) / delta.previous) * 100
  const rounded = Math.round(Math.abs(percent))

  if (rounded === 0) return { text: '0%', tone: 'text-ink-3' }

  return {
    text: `${percent > 0 ? '↑' : '↓'} ${rounded}%`,
    tone: percent > 0 ? 'text-accent' : 'text-negative',
  }
}
</script>

<template>
  <dl
    class="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border xl:grid-cols-5"
  >
    <div
      v-for="(item, index) in items"
      :key="item.label"
      data-testid="kpi"
      :class="[
        'bg-surface p-4',
        index === items.length - 1 && items.length % 2 === 1 ? 'col-span-2 xl:col-span-1' : '',
      ]"
    >
      <dt class="text-[12px] font-medium uppercase tracking-wide text-ink-3">
        {{ item.label }}
      </dt>
      <dd
        :class="[
          'mt-1 whitespace-nowrap font-semibold tracking-tight text-ink tabular-nums',
          index === 0
            ? 'text-xl leading-none sm:text-2xl xl:text-[28px]'
            : 'text-lg leading-none sm:text-xl xl:text-2xl',
        ]"
        :title="item.value"
      >
        {{ item.value }}
      </dd>
      <dd class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-3">
        <span v-if="item.hint" class="truncate">{{ item.hint }}</span>
        <span v-if="deltaOf(item.delta)" :class="['font-medium', deltaOf(item.delta)?.tone]">
          {{ deltaOf(item.delta)?.text }}
        </span>
      </dd>
    </div>
  </dl>
</template>