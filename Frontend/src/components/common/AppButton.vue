<script setup lang="ts">
import { computed } from 'vue'
import LoadingSpinner from './LoadingSpinner.vue'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    loading?: boolean
    block?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
    disabled: false,
    loading: false,
    block: false,
  },
)

const emit = defineEmits<{ click: [event: MouseEvent] }>()

const variantClass = computed(
  () =>
    ({
      primary: 'bg-brand-600 text-white hover:bg-brand-700',
      secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
      danger: 'bg-rose-600 text-white hover:bg-rose-700',
      ghost: 'text-slate-600 hover:bg-slate-100',
    })[props.variant],
)

const sizeClass = computed(
  () =>
    ({
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-5 text-base',
    })[props.size],
)
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
      variantClass,
      sizeClass,
      block ? 'w-full' : '',
    ]"
    @click="emit('click', $event)"
  >
    <LoadingSpinner v-if="loading" class="h-4 w-4" />
    <slot />
  </button>
</template>
