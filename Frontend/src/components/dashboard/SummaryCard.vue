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
  <article class="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
    <p class="text-xs font-medium uppercase tracking-wide text-slate-500">{{ label }}</p>
    <p class="mt-2 truncate text-2xl font-semibold text-slate-900" :title="value">{{ value }}</p>
    <p v-if="hint" class="mt-1 truncate text-xs text-slate-500">{{ hint }}</p>
  </article>
</template>