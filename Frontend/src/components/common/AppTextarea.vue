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
    <label :for="textareaId" class="mb-1.5 block text-[13px] font-medium text-slate-700">
      {{ label }}
      <span v-if="required" class="text-rose-600" aria-hidden="true">*</span>
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
        'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500',
        error ? 'border-rose-600' : 'border-slate-200',
      ]"
    />

    <p v-if="error" :id="`${textareaId}-error`" class="mt-1 text-xs text-rose-600">
      {{ error }}
    </p>
    <p v-else-if="hint" :id="`${textareaId}-hint`" class="mt-1 text-xs text-slate-500">
      {{ hint }}
    </p>
  </div>
</template>