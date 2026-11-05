<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    description?: string
  }>(),
  {
    description: '',
  },
)
</script>

<template>
  <div class="flex flex-col items-center justify-center px-6 py-10 text-center">
    <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
      <span class="text-lg text-slate-400" aria-hidden="true">—</span>
    </div>
    <h3 class="text-sm font-semibold text-slate-900">{{ title }}</h3>
    <p v-if="description" class="mt-1 max-w-sm text-sm text-slate-500">{{ description }}</p>
    <div v-if="$slots.action" class="mt-4">
      <slot name="action" />
    </div>
  </div>
</template>
