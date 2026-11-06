<script setup lang="ts">
import { ref, watch } from 'vue'
import AppInput from '@/components/common/AppInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import type { DateRange, DateRangePreset } from '@/types/dashboard'
import { rangeForPreset, validateRange } from '@/utils/date-range'

const model = defineModel<DateRange>({ required: true })

const presetOptions: ReadonlyArray<{ value: DateRangePreset; label: string }> = [
  { value: 'today', label: 'Hari ini' },
  { value: 'last7', label: '7 hari terakhir' },
  { value: 'last30', label: '30 hari terakhir' },
  { value: 'thisMonth', label: 'Bulan ini' },
  { value: 'custom', label: 'Kustom' },
]

const preset = ref<DateRangePreset>('today')
const startDate = ref(model.value.start_date)
const endDate = ref(model.value.end_date)
const error = ref('')

watch(
  model,
  (value) => {
    startDate.value = value.start_date
    endDate.value = value.end_date
  },
  { deep: true },
)

const emitRange = (range: DateRange): void => {
  const message = validateRange(range)
  error.value = message

  if (message) return

  model.value = range
}

const onPresetChange = (value: string): void => {
  preset.value = value as DateRangePreset

  if (preset.value === 'custom') return

  const range = rangeForPreset(preset.value)
  startDate.value = range.start_date
  endDate.value = range.end_date
  emitRange(range)
}

const onDateChange = (): void => {
  preset.value = 'custom'
  emitRange({ start_date: startDate.value, end_date: endDate.value })
}
</script>

<template>
  <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
    <div class="sm:w-44">
      <AppSelect
        label="Periode"
        :model-value="preset"
        :options="presetOptions"
        @update:model-value="onPresetChange"
      />
    </div>

    <div class="sm:w-40">
      <AppInput
        v-model="startDate"
        label="Dari"
        type="date"
        :error="error"
        :max="endDate"
        @change="onDateChange"
      />
    </div>

    <div class="sm:w-40">
      <AppInput
        v-model="endDate"
        label="Sampai"
        type="date"
        :error="error"
        :min="startDate"
        @change="onDateChange"
      />
    </div>
  </div>
</template>