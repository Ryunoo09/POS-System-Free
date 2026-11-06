<script setup lang="ts">
import { useId } from 'vue'

const model = defineModel<string | number>({ required: true })

const props = withDefaults(
  defineProps<{
    label: string
    type?: string
    placeholder?: string
    error?: string
    hint?: string
    autocomplete?: string
    inputmode?: 'text' | 'none' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search'
    min?: string
    max?: string
    required?: boolean
    disabled?: boolean
  }>(),
  {
    type: 'text',
    placeholder: '',
    error: '',
    hint: '',
    autocomplete: 'off',
    inputmode: 'text',
    min: '',
    max: '',
    required: false,
    disabled: false,
  },
)

const inputId = useId()
const describedBy = () =>
  props.error ? `${inputId}-error` : props.hint ? `${inputId}-hint` : undefined
</script>

<template>
  <div>
    <label :for="inputId" class="mb-1.5 block text-[13px] font-medium text-ink-2">
      {{ label }}
      <span v-if="required" class="text-negative" aria-hidden="true">*</span>
    </label>

    <div class="relative">
      <span
        v-if="$slots.prefix"
        class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-ink-3"
      >
        <slot name="prefix" />
      </span>

      <input
        :id="inputId"
        v-model="model"
        :type="type"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :inputmode="inputmode"
        :min="min || undefined"
        :max="max || undefined"
        :required="required"
        :disabled="disabled"
        :aria-invalid="Boolean(error)"
        :aria-describedby="describedBy()"
        :class="[
          'h-10 w-full rounded-lg border bg-surface px-3 text-sm text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-3',
          error ? 'border-negative' : 'border-border',
          $slots.prefix ? 'pl-10' : '',
          $slots.suffix ? 'pr-12' : '',
        ]"
      />

      <span v-if="$slots.suffix" class="absolute inset-y-0 right-0 flex items-center pr-2">
        <slot name="suffix" />
      </span>
    </div>

    <p v-if="error" :id="`${inputId}-error`" class="mt-1 text-xs text-negative">
      {{ error }}
    </p>
    <p v-else-if="hint" :id="`${inputId}-hint`" class="mt-1 text-xs text-ink-3">
      {{ hint }}
    </p>
  </div>
</template>