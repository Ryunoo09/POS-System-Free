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
    <label :for="inputId" class="mb-1.5 block text-[13px] font-medium text-slate-700">
      {{ label }}
      <span v-if="required" class="text-rose-600" aria-hidden="true">*</span>
    </label>

    <div class="relative">
      <span
        v-if="$slots.prefix"
        class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-slate-500"
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
        :required="required"
        :disabled="disabled"
        :aria-invalid="Boolean(error)"
        :aria-describedby="describedBy()"
        :class="[
          'h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500',
          error ? 'border-rose-600' : 'border-slate-200',
          $slots.prefix ? 'pl-10' : '',
          $slots.suffix ? 'pr-12' : '',
        ]"
      />

      <span v-if="$slots.suffix" class="absolute inset-y-0 right-0 flex items-center pr-2">
        <slot name="suffix" />
      </span>
    </div>

    <p v-if="error" :id="`${inputId}-error`" class="mt-1 text-xs text-rose-600">
      {{ error }}
    </p>
    <p v-else-if="hint" :id="`${inputId}-hint`" class="mt-1 text-xs text-slate-500">
      {{ hint }}
    </p>
  </div>
</template>
