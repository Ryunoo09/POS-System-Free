<script setup lang="ts">
import { ref } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppModal from '@/components/common/AppModal.vue'

defineProps<{
  open: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [startingCash: number]
}>()

const startingCash = ref<number | ''>(50000)
const error = ref('')

const onSubmit = () => {
  if (startingCash.value === '' || startingCash.value < 0) {
    error.value = 'Modal awal harus berupa angka valid (minimal 0)'
    return
  }
  error.value = ''
  emit('submit', Number(startingCash.value))
}
</script>

<template>
  <AppModal :open="open" title="Buka Shift Kasir" max-width="sm">
    <form @submit.prevent="onSubmit" class="space-y-4">
      <p class="text-sm text-ink-2">
        Masukkan jumlah uang kas awal (modal receh/kas laci) sebelum mulai transaksi penjualan.
      </p>

      <AppInput
        v-model.number="startingCash"
        type="number"
        label="Modal Awal (Rp)"
        placeholder="Contoh: 50000"
        :error="error"
        required
      />

      <div class="flex justify-end gap-2 pt-2">
        <AppButton type="submit" :loading="loading"> Buka Shift Sekarang </AppButton>
      </div>
    </form>
  </AppModal>
</template>
