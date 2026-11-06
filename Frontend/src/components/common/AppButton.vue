<script setup lang="ts">
import { computed } from 'vue'
import LoadingSpinner from './LoadingSpinner.vue'

type Variant = 'primary' | 'accent' | 'secondary' | 'danger' | 'ghost'
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
      primary: 'bg-ink text-white hover:bg-ink-hover',
      accent: 'bg-accent text-white hover:bg-accent-hover',
      secondary: 'border border-border bg-surface text-ink-2 hover:bg-surface-2',
      danger: 'border border-negative/50 text-negative hover:border-negative hover:bg-negative-soft',
      ghost: 'text-ink-2 hover:bg-surface-2',
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
      'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
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