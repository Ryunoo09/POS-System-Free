<script setup lang="ts">
import { ref, watch } from 'vue'
import AppInput from '@/components/common/AppInput.vue'
import SegmentedControl from '@/components/common/SegmentedControl.vue'
import type { DateRange, DateRangePreset } from '@/types/dashboard'
import { rangeForPreset, validateRange } from '@/utils/date-range'

const model = defineModel<DateRange>({ required: true })

const presetOptions: ReadonlyArray<{ value: DateRangePreset; label: string }> = [
  { value: 'today', label: 'Hari ini' },
  { value: 'last7', label: '7 hari' },
  { value: 'last30', label: '30 hari' },
  { value: 'thisMonth', label: 'Bulan ini' },
]

/** Cocokkan rentang dengan preset agar pilihan awal filter benar. */
const detectPreset = (range: DateRange): DateRangePreset => {
  for (const option of presetOptions) {
    const candidate = rangeForPreset(option.value)
    if (candidate.start_date === range.start_date && candidate.end_date === range.end_date) {
      return option.value
    }
  }

  return 'custom'
}

const preset = ref<DateRangePreset>(detectPreset(model.value))
const startDate = ref(model.value.start_date)
const endDate = ref(model.value.end_date)
const error = ref('')

watch(
  model,
  (value) => {
    startDate.value = value.start_date
    endDate.value = value.end_date
    preset.value = detectPreset(value)
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
  <div class="flex flex-col gap-3 lg:items-end">
    <div>
      <p class="mb-1.5 text-[13px] font-medium text-ink-2">Periode</p>
      <SegmentedControl
        :model-value="preset"
        :options="presetOptions"
        label="Periode"
        @update:model-value="onPresetChange"
      />
    </div>

    <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
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
  </div>
</template>