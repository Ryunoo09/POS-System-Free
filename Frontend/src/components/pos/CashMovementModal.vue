<script setup lang="ts">
import { ref } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import type { CashMovementType } from '@/types/shift'

defineProps<{
  open: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: { type: CashMovementType; amount: number; reason: string }]
}>()

const type = ref<CashMovementType>('CASH_OUT')
const amount = ref<number | ''>('')
const reason = ref('')
const error = ref('')

const typeOptions = [
  { value: 'CASH_IN', label: 'Kas Masuk (Tambah Modal / Titipan)' },
  { value: 'CASH_OUT', label: 'Kas Keluar (Operasional / Beli Kebutuhan)' },
]

const onSubmit = () => {
  if (amount.value === '' || amount.value <= 0) {
    error.value = 'Jumlah kas harus lebih besar dari 0'
    return
  }
  if (!reason.value.trim() || reason.value.trim().length < 3) {
    error.value = 'Alasan mutasi kas minimal 3 karakter'
    return
  }
  error.value = ''
  emit('submit', {
    type: type.value,
    amount: Number(amount.value),
    reason: reason.value.trim(),
  })
}
</script>

<template>
  <AppModal :open="open" title="Catat Kas Masuk / Keluar" max-width="sm" @close="emit('close')">
    <form @submit.prevent="onSubmit" class="space-y-4">
      <AppSelect
        v-model="type"
        label="Jenis Mutasi"
        :options="typeOptions"
      />

      <AppInput
        v-model.number="amount"
        type="number"
        label="Jumlah Uang (Rp)"
        placeholder="Contoh: 20000"
        required
      />

      <AppInput
        v-model="reason"
        label="Alasan / Keperluan"
        placeholder="Contoh: Beli kertas struk kasir"
        required
      />

      <p v-if="error" class="text-xs text-danger font-medium">{{ error }}</p>

      <div class="flex justify-end gap-2 pt-2 border-t border-border">
        <AppButton variant="secondary" type="button" @click="emit('close')">Batal</AppButton>
        <AppButton type="submit" :loading="loading">Simpan Mutasi</AppButton>
      </div>
    </form>
  </AppModal>
</template>
