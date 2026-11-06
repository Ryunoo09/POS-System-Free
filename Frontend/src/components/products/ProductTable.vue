<script setup lang="ts">
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import type { Product } from '@/types/product'
import { formatNumber, formatRupiah } from '@/utils/format'

withDefaults(
  defineProps<{
    products: Product[]
    canWrite: boolean
    showCost?: boolean
  }>(),
  { showCost: false },
)

const emit = defineEmits<{
  edit: [product: Product]
  toggle: [product: Product]
}>()
</script>

<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-border text-sm">
      <thead>
        <tr class="text-left text-xs uppercase tracking-wide text-ink-3">
          <th scope="col" class="px-4 py-3 font-medium">Produk</th>
          <th scope="col" class="hidden px-4 py-3 font-medium md:table-cell">Kategori</th>
          <th v-if="showCost" scope="col" class="hidden px-4 py-3 font-medium lg:table-cell">
            Harga Modal
          </th>
          <th scope="col" class="px-4 py-3 font-medium">Harga Jual</th>
          <th scope="col" class="px-4 py-3 font-medium">Stok</th>
          <th scope="col" class="px-4 py-3 font-medium">Status</th>
          <th v-if="canWrite" scope="col" class="px-4 py-3 text-right font-medium">Aksi</th>
        </tr>
      </thead>

      <tbody class="divide-y divide-border">
        <tr v-for="product in products" :key="product.id" class="hover:bg-surface-2">
          <td class="px-4 py-3">
            <p class="font-medium text-ink">{{ product.name }}</p>
            <p class="text-xs text-ink-3">{{ product.sku }}</p>
          </td>
          <td class="hidden px-4 py-3 text-ink-2 md:table-cell">{{ product.category.name }}</td>
          <td v-if="showCost" class="hidden px-4 py-3 text-ink-2 lg:table-cell">
            {{ product.cost_price ? formatRupiah(product.cost_price) : '—' }}
          </td>
          <td class="px-4 py-3 text-ink-2">{{ formatRupiah(product.selling_price) }}</td>
          <td class="px-4 py-3">
            <div class="flex items-center gap-2">
              <span :class="product.is_low_stock ? 'font-medium text-negative' : 'text-ink-2'">
                {{ formatNumber(product.stock) }}
              </span>
              <AppBadge v-if="product.is_low_stock" tone="warning">Rendah</AppBadge>
            </div>
          </td>
          <td class="px-4 py-3">
            <AppBadge :tone="product.is_active ? 'success' : 'neutral'">
              {{ product.is_active ? 'Aktif' : 'Nonaktif' }}
            </AppBadge>
          </td>
          <td v-if="canWrite" class="px-4 py-3">
            <div class="flex justify-end gap-2">
              <AppButton variant="secondary" size="sm" @click="emit('edit', product)">
                Ubah
              </AppButton>
              <AppButton
                :variant="product.is_active ? 'danger' : 'ghost'"
                size="sm"
                @click="emit('toggle', product)"
              >
                {{ product.is_active ? 'Nonaktifkan' : 'Aktifkan' }}
              </AppButton>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>