<script setup lang="ts">
import { computed } from 'vue'

type Tone = 'success' | 'danger' | 'warning' | 'neutral'

const props = withDefaults(defineProps<{ tone?: Tone }>(), { tone: 'neutral' })

const toneClass = computed(
  () =>
    ({
      success: 'bg-emerald-50 text-emerald-700',
      danger: 'bg-rose-50 text-rose-700',
      warning: 'bg-amber-50 text-amber-700',
      neutral: 'bg-slate-100 text-slate-600',
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