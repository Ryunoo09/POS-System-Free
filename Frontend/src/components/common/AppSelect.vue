<script setup lang="ts">
import { useId } from 'vue'

const model = defineModel<string>({ required: true })

const props = withDefaults(
  defineProps<{
    label: string
    options: ReadonlyArray<{ value: string; label: string }>
    placeholder?: string
    error?: string
    hint?: string
    required?: boolean
    disabled?: boolean
  }>(),
  {
    placeholder: '',
    error: '',
    hint: '',
    required: false,
    disabled: false,
  },
)

const selectId = useId()
const describedBy = () =>
  props.error ? `${selectId}-error` : props.hint ? `${selectId}-hint` : undefined
</script>

<template>
  <div>
    <label :for="selectId" class="mb-1.5 block text-[13px] font-medium text-slate-700">
      {{ label }}
      <span v-if="required" class="text-rose-600" aria-hidden="true">*</span>
    </label>

    <select
      :id="selectId"
      v-model="model"
      :required="required"
      :disabled="disabled"
      :aria-invalid="Boolean(error)"
      :aria-describedby="describedBy()"
      :class="[
        'h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500',
        error ? 'border-rose-600' : 'border-slate-200',
      ]"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <p v-if="error" :id="`${selectId}-error`" class="mt-1 text-xs text-rose-600">
      {{ error }}
    </p>
    <p v-else-if="hint" :id="`${selectId}-hint`" class="mt-1 text-xs text-slate-500">
      {{ hint }}
    </p>
  </div>
</template>
