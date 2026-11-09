<script setup lang="ts">
import { computed, ref } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppTextarea from '@/components/common/AppTextarea.vue'
import type { ShiftSummary } from '@/types/shift'
import { formatRupiah } from '@/utils/format'

const props = defineProps<{
  open: boolean
  summary: ShiftSummary | null
  loading?: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: { actualCash: number; differenceNote?: string }]
}>()

const actualCash = ref<number | ''>('')
const differenceNote = ref('')
const error = ref('')

const expectedCash = computed(() => (props.summary ? Number(props.summary.expected_cash) : 0))

const difference = computed(() => {
  if (actualCash.value === '') return null
  return Number(actualCash.value) - expectedCash.value
})

const onSubmit = () => {
  if (actualCash.value === '' || actualCash.value < 0) {
    error.value = 'Uang fisik aktual harus diisi dengan angka valid'
    return
  }
  error.value = ''
  emit('submit', {
    actualCash: Number(actualCash.value),
    differenceNote: differenceNote.value.trim() || undefined,
  })
}
</script>

<template>
  <AppModal :open="open" title="Tutup Shift & Rekonsiliasi Kas" max-width="md" @close="emit('close')">
    <form @submit.prevent="onSubmit" class="space-y-4">
      <div v-if="summary" class="rounded-xl border border-border bg-surface-2 p-3 text-xs space-y-1.5">
        <div class="flex justify-between">
          <span class="text-ink-3">Modal Awal:</span>
          <span class="font-medium text-ink">{{ formatRupiah(summary.starting_cash) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-ink-3">Total Penjualan Tunai:</span>
          <span class="font-medium text-accent-ink">+{{ formatRupiah(summary.cash_sales) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-ink-3">Kas Masuk (Lainnya):</span>
          <span class="font-medium text-ink">+{{ formatRupiah(summary.cash_in) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-ink-3">Kas Keluar (Operasional):</span>
          <span class="font-medium text-danger">-{{ formatRupiah(summary.cash_out) }}</span>
        </div>
        <div class="flex justify-between border-t border-border pt-1.5 font-bold text-sm">
          <span>Ekspektasi Kas Sistem:</span>
          <span>{{ formatRupiah(summary.expected_cash) }}</span>
        </div>
      </div>

      <AppInput
        v-model.number="actualCash"
        type="number"
        label="Uang Fisik Kasir (Hasil Hitung)"
        placeholder="Hitung uang tunai di laci kasir"
        :error="error"
        required
      />

      <div v-if="difference !== null" class="rounded-lg p-2.5 text-xs font-medium" :class="[
        difference === 0 ? 'bg-accent-soft text-accent-ink' : 'bg-danger/10 text-danger'
      ]">
        Selisih Kas: {{ formatRupiah(difference) }}
        <span v-if="difference === 0"> (Sesuai)</span>
        <span v-else-if="difference > 0"> (Lebih)</span>
        <span v-else> (Kurang)</span>
      </div>

      <AppTextarea
        v-model="differenceNote"
        label="Catatan Selisih / Penutupan"
        placeholder="Keterangan jika terdapat selisih uang kas"
        :rows="2"
      />

      <div class="flex justify-end gap-2 pt-2 border-t border-border">
        <AppButton variant="secondary" type="button" @click="emit('close')">Batal</AppButton>
        <AppButton type="submit" variant="danger" :loading="loading">Konfirmasi Tutup Shift</AppButton>
      </div>
    </form>
  </AppModal>
</template>
