<script setup lang="ts">
import AppInput from '@/components/common/AppInput.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import CartItemRow from './CartItemRow.vue'
import type { CartItem } from '@/types/cart'
import { formatRupiah } from '@/utils/format'

withDefaults(
  defineProps<{
    items: CartItem[]
    subtotal: number
    discountInput: number
    discount: number
    discountError?: string
    taxAmount: number
    totalAmount: number
    itemErrors?: Record<string, string>
    disabled?: boolean
  }>(),
  {
    discountError: '',
    itemErrors: () => ({}),
    disabled: false,
  },
)

const emit = defineEmits<{
  increment: [productId: string]
  decrement: [productId: string]
  remove: [productId: string]
  'update-quantity': [productId: string, quantity: number]
  'update:discount': [value: number]
  clear: []
}>()

const setDiscount = (value: string | number): void => {
  emit('update:discount', Number(value))
}
</script>

<template>
  <section class="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-card">
    <header class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
      <h2 class="text-sm font-semibold text-slate-900">Keranjang</h2>
      <button
        v-if="items.length > 0"
        type="button"
        class="text-xs font-medium text-slate-500 hover:text-rose-600 disabled:opacity-50"
        :disabled="disabled"
        @click="emit('clear')"
      >
        Kosongkan
      </button>
    </header>

    <div class="flex-1 overflow-y-auto px-4">
      <EmptyState
        v-if="items.length === 0"
        title="Keranjang kosong"
        description="Pilih produk dari katalog atau pindai barcode."
      />

      <ul v-else class="divide-y divide-slate-100">
        <CartItemRow
          v-for="item in items"
          :key="item.product.id"
          :item="item"
          :error="itemErrors[item.product.id]"
          @increment="emit('increment', $event)"
          @decrement="emit('decrement', $event)"
          @remove="emit('remove', $event)"
          @update-quantity="(productId, quantity) => emit('update-quantity', productId, quantity)"
        />
      </ul>
    </div>

    <div class="space-y-3 border-t border-slate-200 px-4 py-3">
      <AppInput
        :model-value="discountInput"
        label="Diskon transaksi"
        type="number"
        inputmode="numeric"
        min="0"
        :error="discountError"
        :disabled="disabled || items.length === 0"
        @update:model-value="setDiscount"
      >
        <template #prefix>Rp</template>
      </AppInput>

      <dl class="space-y-1.5 text-sm">
        <div class="flex justify-between text-slate-600">
          <dt>Subtotal</dt>
          <dd>{{ formatRupiah(subtotal) }}</dd>
        </div>
        <div v-if="discount > 0" class="flex justify-between text-rose-600">
          <dt>Diskon</dt>
          <dd>-{{ formatRupiah(discount) }}</dd>
        </div>
        <div class="flex justify-between text-slate-600">
          <dt>Pajak</dt>
          <dd>{{ formatRupiah(taxAmount) }}</dd>
        </div>
        <div class="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
          <dt>Total</dt>
          <dd>{{ formatRupiah(totalAmount) }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>
