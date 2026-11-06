<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    value: string
    hint?: string
  }>(),
  {
    hint: '',
  },
)
</script>

<template>
  <article class="rounded-xl border border-border bg-surface p-4">
    <p class="text-[12px] font-medium uppercase tracking-wide text-ink-3">{{ label }}</p>
    <p class="mt-2 truncate text-2xl font-semibold text-ink tabular-nums" :title="value">
      {{ value }}
    </p>
    <p v-if="hint" class="mt-1 truncate text-xs text-ink-3">{{ hint }}</p>
  </article>
</template>