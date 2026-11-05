<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    width?: string
    height?: string
    rounded?: 'sm' | 'md' | 'lg' | 'full'
  }>(),
  {
    width: '100%',
    height: '1rem',
    rounded: 'md',
  },
)

const roundedClass = computed(
  () =>
    ({
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      full: 'rounded-full',
    })[props.rounded],
)
</script>

<template>
  <div
    class="animate-pulse bg-slate-200"
    :class="roundedClass"
    :style="{ width, height }"
    aria-hidden="true"
  />
</template>
