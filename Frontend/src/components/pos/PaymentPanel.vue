<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import type { PaymentMethod } from '@/types/transaction'
import { PAYMENT_METHODS } from '@/utils/constants'
import { formatRupiah } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    method: PaymentMethod
    amountPaid: number
    reference: string
    totalAmount: number
    changeAmount: number
    isCash: boolean
    canCheckout: boolean
    isCheckingOut: boolean
    formError?: string
  }>(),
  { formError: '' },
)

const emit = defineEmits<{
  'update:method': [method: PaymentMethod]
  'update:amount-paid': [value: number]
  'update:reference': [value: string]
  checkout: []
}>()

const methodOptions = PAYMENT_METHODS.map((item) => ({
  value: item.value,
  label: item.label,
}))

const quickAmounts = computed(() =>
  props.isCash ? [...new Set([props.totalAmount, 50000, 100000])] : [],
)

const setAmount = (value: string | number): void => {
  emit('update:amount-paid', Number(value))
}

const setMethod = (value: string): void => {
  emit('update:method', value as PaymentMethod)
}
</script>

<template>
  <section class="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
    <h2 class="text-sm font-semibold text-slate-900">Pembayaran</h2>

    <div
      v-if="formError"
      class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
    >
      {{ formError }}
    </div>

    <AppSelect
      :model-value="method"
      label="Metode pembayaran"
      :options="methodOptions"
      @update:model-value="setMethod"
    />

    <AppInput
      :model-value="isCash ? amountPaid : totalAmount"
      label="Jumlah dibayar"
      type="number"
      inputmode="numeric"
      min="0"
      :disabled="!isCash || isCheckingOut"
      @update:model-value="setAmount"
    >
      <template #prefix>Rp</template>
    </AppInput>

    <div v-if="isCash" class="flex flex-wrap gap-2">
      <button
        v-for="amount in quickAmounts"
        :key="amount"
        type="button"
        class="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
        :disabled="isCheckingOut"
        @click="emit('update:amount-paid', amount)"
      >
        {{ amount === totalAmount ? 'Uang pas' : formatRupiah(amount) }}
      </button>
    </div>

    <AppInput
      v-if="!isCash"
      :model-value="reference"
      label="Referensi pembayaran (opsional)"
      placeholder="Contoh: nomor transaksi QRIS"
      :disabled="isCheckingOut"
      @update:model-value="(value) => emit('update:reference', String(value))"
    />

    <div class="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <span class="text-sm text-slate-600">Kembalian</span>
      <span class="text-lg font-semibold text-emerald-600">
        {{ formatRupiah(changeAmount) }}
      </span>
    </div>

    <AppButton
      block
      size="lg"
      :loading="isCheckingOut"
      :disabled="!canCheckout || isCheckingOut"
      @click="emit('checkout')"
    >
      Checkout
    </AppButton>
  </section>
</template>
