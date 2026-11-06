<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/types/product'
import { formatRupiah } from '@/utils/format'

const props = defineProps<{ product: Product }>()
const emit = defineEmits<{ add: [product: Product] }>()

const isOutOfStock = computed(() => props.product.stock <= 0)
</script>

<template>
  <button
    type="button"
    :disabled="isOutOfStock"
    :aria-label="`Tambah ${product.name} ke keranjang`"
    class="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-3 text-left shadow-card transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:border-slate-200 disabled:hover:shadow-card"
    @click="emit('add', product)"
  >
    <div class="flex items-start justify-between gap-2">
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700"
        aria-hidden="true"
      >
        {{ product.name.charAt(0).toUpperCase() }}
      </div>
      <span
        v-if="isOutOfStock"
        class="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700"
      >
        Habis
      </span>
      <span
        v-else
        class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
      >
        Stok {{ product.stock }}
      </span>
    </div>

    <p class="mt-3 line-clamp-2 text-sm font-medium text-slate-900">{{ product.name }}</p>
    <p class="mt-0.5 truncate text-xs text-slate-500">
      {{ product.sku }} · {{ product.category.name }}
    </p>

    <p class="mt-auto pt-2 text-base font-semibold text-brand-700">
      {{ formatRupiah(product.selling_price) }}
    </p>
  </button>
</template>
