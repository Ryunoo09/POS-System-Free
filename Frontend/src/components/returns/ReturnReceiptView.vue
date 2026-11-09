<script setup lang="ts">
import { computed } from 'vue'
import type { ReturnRecord } from '@/types/return'
import { PAYMENT_METHODS } from '@/utils/constants'
import { formatDateTime, formatRupiah } from '@/utils/format'

const props = defineProps<{ record: ReturnRecord }>()

const refundMethodLabel = computed(
  () =>
    PAYMENT_METHODS.find((method) => method.value === props.record.refund_method)?.label ??
    props.record.refund_method,
)
</script>

<template>
  <div class="receipt mx-auto w-full max-w-[80mm] bg-surface p-4 text-[12px] leading-relaxed text-ink">
    <div class="text-center">
      <p class="text-base font-bold">POS System</p>
      <p class="text-xs text-ink-3">Bukti Retur</p>
    </div>

    <div class="mt-3 space-y-1 border-y border-dashed border-border py-2 text-xs">
      <div class="flex justify-between gap-2">
        <span>No. Retur</span>
        <span class="font-medium">{{ record.return_number }}</span>
      </div>
      <div class="flex justify-between gap-2">
        <span>Invoice</span>
        <span class="font-medium">{{ record.transaction.invoice_number }}</span>
      </div>
      <div class="flex justify-between gap-2">
        <span>Waktu</span>
        <span>{{ formatDateTime(record.created_at) }}</span>
      </div>
      <div class="flex justify-between gap-2">
        <span>Kasir</span>
        <span>{{ record.cashier.name }}</span>
      </div>
    </div>

    <ul class="mt-2 space-y-2 border-b border-dashed border-border pb-2">
      <li v-for="item in record.items" :key="item.id">
        <p class="font-medium">{{ item.product_name }}</p>
        <div class="flex justify-between gap-2 text-xs text-ink-2">
          <span>{{ item.quantity }} × {{ formatRupiah(item.unit_price) }}</span>
          <span>{{ formatRupiah(item.subtotal) }}</span>
        </div>
        <p class="text-[11px] text-ink-3">
          {{ item.action === 'RESTOCK' ? 'Kembali ke stok' : 'Rusak / tidak masuk stok' }}
        </p>
      </li>
    </ul>

    <dl class="mt-2 space-y-1 text-xs">
      <div class="flex justify-between gap-2 border-t border-border pt-1 text-sm font-bold">
        <dt>Refund</dt>
        <dd>{{ formatRupiah(record.refund_amount) }}</dd>
      </div>
      <div class="flex justify-between gap-2">
        <dt>Metode</dt>
        <dd>{{ refundMethodLabel }}</dd>
      </div>
      <div class="flex justify-between gap-2">
        <dt>Alasan</dt>
        <dd class="text-right">{{ record.reason }}</dd>
      </div>
    </dl>

    <p class="mt-4 text-center text-xs text-ink-3">Terima kasih</p>
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