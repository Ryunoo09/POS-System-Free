<script setup lang="ts">
const model = defineModel<string>({ required: true })

withDefaults(
  defineProps<{
    options: ReadonlyArray<{ value: string; label: string }>
    label?: string
  }>(),
  {
    label: '',
  },
)
</script>

<template>
  <div
    role="group"
    :aria-label="label || undefined"
    class="inline-flex flex-wrap gap-0.5 rounded-lg bg-surface-2 p-0.5"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="model === option.value"
      :class="[
        'cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 ease-out',
        model === option.value
          ? 'bg-surface text-ink ring-1 ring-border'
          : 'text-ink-3 hover:text-ink',
      ]"
      @click="model = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>