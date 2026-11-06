<script setup lang="ts">
import { computed } from 'vue'

type Tone = 'success' | 'danger' | 'warning' | 'neutral'

const props = withDefaults(defineProps<{ tone?: Tone }>(), { tone: 'neutral' })

const toneClass = computed(
  () =>
    ({
      success: 'bg-accent-soft text-accent-ink',
      danger: 'bg-negative-soft text-negative',
      warning: 'bg-warning-soft text-warning',
      neutral: 'bg-surface-2 text-ink-2',
    })[props.tone],
)
</script>

<template>
  <span
    :class="['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', toneClass]"
  >
    <slot />
  </span>
</template>