<script setup lang="ts">
import { computed } from 'vue'
import type { TransactionDetail } from '@/types/transaction'
import { PAYMENT_METHODS } from '@/utils/constants'
import { formatDateTime, formatRupiah } from '@/utils/format'

const props = defineProps<{ transaction: TransactionDetail }>()

const paymentLabel = computed(
  () =>
    PAYMENT_METHODS.find((method) => method.value === props.transaction.payment_method)?.label ??
    props.transaction.payment_method,
)
</script>

<template>
  <div class="receipt mx-auto w-full max-w-[80mm] bg-white p-4 text-[12px] leading-relaxed text-slate-900">
    <div class="text-center">
      <p class="text-base font-bold">POS System</p>
      <p class="text-xs text-slate-500">Struk Pembayaran</p>
    </div>

    <div class="mt-3 space-y-1 border-y border-dashed border-slate-300 py-2 text-xs">
      <div class="flex justify-between gap-2">
        <span>Invoice</span>
        <span class="font-medium">{{ transaction.invoice_number }}</span>
      </div>
      <div class="flex justify-between gap-2">
        <span>Waktu</span>
        <span>{{ formatDateTime(transaction.created_at) }}</span>
      </div>
      <div class="flex justify-between gap-2">
        <span>Kasir</span>
        <span>{{ transaction.cashier.name }}</span>
      </div>
    </div>

    <ul class="mt-2 space-y-2 border-b border-dashed border-slate-300 pb-2">
      <li v-for="item in transaction.items" :key="item.product_id">
        <p class="font-medium">{{ item.product_name }}</p>
        <div class="flex justify-between gap-2 text-xs text-slate-600">
          <span>{{ item.quantity }} × {{ formatRupiah(item.unit_price) }}</span>
          <span>{{ formatRupiah(item.subtotal) }}</span>
        </div>
      </li>
    </ul>

    <dl class="mt-2 space-y-1 text-xs">
      <div class="flex justify-between gap-2">
        <dt>Subtotal</dt>
        <dd>{{ formatRupiah(transaction.subtotal) }}</dd>
      </div>
      <div v-if="Number(transaction.discount_amount) > 0" class="flex justify-between gap-2">
        <dt>Diskon</dt>
        <dd>-{{ formatRupiah(transaction.discount_amount) }}</dd>
      </div>
      <div class="flex justify-between gap-2">
        <dt>Pajak</dt>
        <dd>{{ formatRupiah(transaction.tax_amount) }}</dd>
      </div>
      <div class="flex justify-between gap-2 border-t border-slate-300 pt-1 text-sm font-bold">
        <dt>Total</dt>
        <dd>{{ formatRupiah(transaction.total_amount) }}</dd>
      </div>
      <div class="flex justify-between gap-2">
        <dt>Metode</dt>
        <dd>{{ paymentLabel }}</dd>
      </div>
      <div class="flex justify-between gap-2">
        <dt>Dibayar</dt>
        <dd>{{ formatRupiah(transaction.amount_paid) }}</dd>
      </div>
      <div class="flex justify-between gap-2">
        <dt>Kembalian</dt>
        <dd>{{ formatRupiah(transaction.change_amount) }}</dd>
      </div>
    </dl>

    <p class="mt-4 text-center text-xs text-slate-500">Terima kasih</p>
  </div>
</template>

<style scoped>
@media print {
  :global(body *) {
    visibility: hidden;
  }

  .receipt,
  .receipt * {
    visibility: visible;
  }

  .receipt {
    position: absolute;
    top: 0;
    left: 0;
    width: 80mm;
    max-width: none;
    padding: 0;
  }
}
</style>
