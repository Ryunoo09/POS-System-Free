<script setup lang="ts">
import { computed } from 'vue'
import type { CartItem } from '@/types/cart'
import { formatNumber, formatRupiah } from '@/utils/format'

const props = withDefaults(
  defineProps<{ item: CartItem; error?: string }>(),
  { error: '' },
)

const emit = defineEmits<{
  increment: [productId: string]
  decrement: [productId: string]
  remove: [productId: string]
  'update-quantity': [productId: string, quantity: number]
}>()

const lineTotal = computed(
  () => Number(props.item.product.selling_price) * props.item.quantity,
)

const onQuantityChange = (event: Event): void => {
  const value = Number((event.target as HTMLInputElement).value)
  emit('update-quantity', props.item.product.id, value)
}
</script>

<template>
  <li class="py-3">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="truncate text-sm font-medium text-slate-900">{{ item.product.name }}</p>
        <p class="mt-0.5 text-xs text-slate-500">
          {{ formatRupiah(item.product.selling_price) }} · {{ item.product.sku }}
        </p>
      </div>
      <p class="shrink-0 text-sm font-semibold text-slate-900">{{ formatRupiah(lineTotal) }}</p>
    </div>

    <div class="mt-2 flex items-center justify-between gap-2">
      <div class="inline-flex items-center rounded-lg border border-slate-200">
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          :aria-label="`Kurangi jumlah ${item.product.name}`"
          :disabled="item.quantity <= 1"
          @click="emit('decrement', item.product.id)"
        >
          −
        </button>
        <input
          type="number"
          :value="item.quantity"
          min="1"
          :max="item.product.stock"
          :aria-label="`Jumlah ${item.product.name}`"
          class="h-8 w-12 border-x border-slate-200 text-center text-sm text-slate-900 focus:outline-none"
          @change="onQuantityChange"
        />
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          :aria-label="`Tambah jumlah ${item.product.name}`"
          :disabled="item.quantity >= item.product.stock"
          @click="emit('increment', item.product.id)"
        >
          +
        </button>
      </div>

      <div class="flex items-center gap-3">
        <span class="text-xs text-slate-400">Maks {{ formatNumber(item.product.stock) }}</span>
        <button
          type="button"
          class="text-xs font-medium text-rose-600 hover:text-rose-700"
          :aria-label="`Hapus ${item.product.name}`"
          @click="emit('remove', item.product.id)"
        >
          Hapus
        </button>
      </div>
    </div>

    <p v-if="error" class="mt-1 text-xs font-medium text-rose-600">{{ error }}</p>
  </li>
</template>
