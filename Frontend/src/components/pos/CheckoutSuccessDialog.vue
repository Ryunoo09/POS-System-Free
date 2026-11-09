<script setup lang="ts">
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'
import ReceiptView from './ReceiptView.vue'
import type { TransactionDetail } from '@/types/transaction'
import { formatRupiah } from '@/utils/format'

defineProps<{ open: boolean; transaction: TransactionDetail | null; autoPrint: boolean }>()

const emit = defineEmits<{
  close: []
  'new-transaction': []
  'update:autoPrint': [value: boolean]
}>()

const printReceipt = (): void => {
  window.print()
}
</script>

<template>
  <AppModal :open="open" title="Transaksi berhasil" max-width="md" @close="emit('close')">
    <div v-if="transaction" class="space-y-4">
      <div class="rounded-xl bg-accent-soft px-4 py-4 text-center">
        <p class="text-sm font-medium text-accent-ink">Pembayaran diterima</p>
        <p class="mt-1 text-3xl font-bold text-accent-ink">
          {{ formatRupiah(transaction.total_amount) }}
        </p>
        <p class="mt-1 text-sm text-accent-ink">
          Kembalian {{ formatRupiah(transaction.change_amount) }}
        </p>
        <p class="mt-1 text-xs text-accent">{{ transaction.invoice_number }}</p>
      </div>

      <ReceiptView :transaction="transaction" />
    </div>

    <template #footer>
      <label class="mr-auto flex items-center gap-2 text-xs text-ink-2">
        <input
          type="checkbox"
          :checked="autoPrint"
          @change="emit('update:autoPrint', ($event.target as HTMLInputElement).checked)"
        />
        Cetak otomatis
      </label>
      <AppButton variant="secondary" @click="printReceipt">Cetak Struk</AppButton>
      <AppButton @click="emit('new-transaction')">Transaksi Baru</AppButton>
    </template>
  </AppModal>
</template>