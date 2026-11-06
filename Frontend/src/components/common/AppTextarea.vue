<script setup lang="ts">
import { useId } from 'vue'

const model = defineModel<string>({ required: true })

const props = withDefaults(
  defineProps<{
    label: string
    placeholder?: string
    error?: string
    hint?: string
    rows?: number
    maxlength?: number
    required?: boolean
    disabled?: boolean
  }>(),
  {
    placeholder: '',
    error: '',
    hint: '',
    rows: 3,
    maxlength: undefined,
    required: false,
    disabled: false,
  },
)

const textareaId = useId()
const describedBy = () =>
  props.error ? `${textareaId}-error` : props.hint ? `${textareaId}-hint` : undefined
</script>

<template>
  <div>
    <label :for="textareaId" class="mb-1.5 block text-[13px] font-medium text-ink-2">
      {{ label }}
      <span v-if="required" class="text-negative" aria-hidden="true">*</span>
    </label>

    <textarea
      :id="textareaId"
      v-model="model"
      :placeholder="placeholder"
      :rows="rows"
      :maxlength="maxlength"
      :required="required"
      :disabled="disabled"
      :aria-invalid="Boolean(error)"
      :aria-describedby="describedBy()"
      :class="[
        'w-full rounded-lg border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-3',
        error ? 'border-negative' : 'border-border',
      ]"
    />

    <p v-if="error" :id="`${textareaId}-error`" class="mt-1 text-xs text-negative">
      {{ error }}
    </p>
    <p v-else-if="hint" :id="`${textareaId}-hint`" class="mt-1 text-xs text-ink-3">
      {{ hint }}
    </p>
  </div>
</template>