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
    class="group flex h-full flex-col rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:border-accent-mark hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:bg-surface"
    @click="emit('add', product)"
  >
    <div class="flex items-start justify-between gap-2">
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-sm font-bold text-accent"
        aria-hidden="true"
      >
        {{ product.name.charAt(0).toUpperCase() }}
      </div>
      <span
        v-if="isOutOfStock"
        class="rounded-full bg-negative-soft px-2 py-0.5 text-[11px] font-medium text-negative"
      >
        Habis
      </span>
      <span
        v-else
        class="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink-2"
      >
        Stok {{ product.stock }}
      </span>
    </div>

    <p class="mt-3 line-clamp-2 text-sm font-medium text-ink">{{ product.name }}</p>
    <p class="mt-0.5 truncate text-xs text-ink-3">
      {{ product.sku }} · {{ product.category.name }}
    </p>

    <p class="mt-auto pt-2 text-base font-semibold text-accent">
      {{ formatRupiah(product.selling_price) }}
    </p>
  </button>
</template>
