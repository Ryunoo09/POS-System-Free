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
    <label :for="selectId" class="mb-1.5 block text-[13px] font-medium text-ink-2">
      {{ label }}
      <span v-if="required" class="text-negative" aria-hidden="true">*</span>
    </label>

    <select
      :id="selectId"
      v-model="model"
      :required="required"
      :disabled="disabled"
      :aria-invalid="Boolean(error)"
      :aria-describedby="describedBy()"
      :class="[
        'h-10 w-full rounded-lg border bg-surface px-3 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-3',
        error ? 'border-negative' : 'border-border',
      ]"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <p v-if="error" :id="`${selectId}-error`" class="mt-1 text-xs text-negative">
      {{ error }}
    </p>
    <p v-else-if="hint" :id="`${selectId}-hint`" class="mt-1 text-xs text-ink-3">
      {{ hint }}
    </p>
  </div>
</template>