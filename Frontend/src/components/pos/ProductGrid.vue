<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import ProductCard from './ProductCard.vue'
import type { Product } from '@/types/product'

withDefaults(
  defineProps<{
    products: Product[]
    loading?: boolean
    error?: string
    emptyTitle?: string
    emptyDescription?: string
  }>(),
  {
    loading: false,
    error: '',
    emptyTitle: 'Produk tidak ditemukan',
    emptyDescription: 'Coba kata kunci atau kategori lain.',
  },
)

const emit = defineEmits<{ add: [product: Product]; retry: [] }>()
</script>

<template>
  <div>
    <div v-if="loading" class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      <SkeletonBlock v-for="index in 8" :key="index" height="9.5rem" />
    </div>

    <ErrorState v-else-if="error" :message="error" @retry="emit('retry')" />

    <EmptyState
      v-else-if="products.length === 0"
      :title="emptyTitle"
      :description="emptyDescription"
    />

    <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      <ProductCard
        v-for="product in products"
        :key="product.id"
        :product="product"
        @add="emit('add', $event)"
      />
    </div>
  </div>
</template>
