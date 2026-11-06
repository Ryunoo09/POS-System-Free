<script setup lang="ts">
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import type { AdjustMovementType } from '@/types/inventory'
import type { Product } from '@/types/product'
import { formatNumber, formatRupiah } from '@/utils/format'

type StockTableItem = Product & { stock_value?: string }

withDefaults(
  defineProps<{
    items: StockTableItem[]
    canAdjust: boolean
    showValue?: boolean
  }>(),
  { showValue: false },
)

const emit = defineEmits<{
  adjust: [product: Product, type: AdjustMovementType]
}>()
</script>

<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-border text-sm">
      <thead>
        <tr class="text-left text-xs uppercase tracking-wide text-ink-3">
          <th scope="col" class="px-4 py-3 font-medium">Produk</th>
          <th scope="col" class="hidden px-4 py-3 font-medium md:table-cell">Kategori</th>
          <th scope="col" class="px-4 py-3 font-medium">Stok</th>
          <th scope="col" class="hidden px-4 py-3 font-medium sm:table-cell">Min.</th>
          <th scope="col" class="hidden px-4 py-3 font-medium lg:table-cell">Satuan</th>
          <th v-if="showValue" scope="col" class="hidden px-4 py-3 font-medium lg:table-cell">
            Nilai Stok
          </th>
          <th v-if="canAdjust" scope="col" class="px-4 py-3 text-right font-medium">Aksi</th>
        </tr>
      </thead>

      <tbody class="divide-y divide-border">
        <tr v-for="product in items" :key="product.id" class="hover:bg-surface-2">
          <td class="px-4 py-3">
            <p class="font-medium text-ink">{{ product.name }}</p>
            <p class="text-xs text-ink-3">{{ product.sku }}</p>
          </td>
          <td class="hidden px-4 py-3 text-ink-2 md:table-cell">{{ product.category.name }}</td>
          <td class="px-4 py-3">
            <div class="flex items-center gap-2">
              <span :class="product.is_low_stock ? 'font-medium text-negative' : 'text-ink-2'">
                {{ formatNumber(product.stock) }}
              </span>
              <AppBadge v-if="product.is_low_stock" tone="warning">Rendah</AppBadge>
            </div>
          </td>
          <td class="hidden px-4 py-3 text-ink-2 sm:table-cell">
            {{ formatNumber(product.min_stock) }}
          </td>
          <td class="hidden px-4 py-3 text-ink-2 lg:table-cell">{{ product.unit }}</td>
          <td v-if="showValue" class="hidden px-4 py-3 font-medium text-ink-2 lg:table-cell">
            {{ product.stock_value ? formatRupiah(product.stock_value) : '—' }}
          </td>
          <td v-if="canAdjust" class="px-4 py-3">
            <div class="flex justify-end gap-2">
              <AppButton variant="secondary" size="sm" @click="emit('adjust', product, 'PURCHASE')">
                Tambah Stok
              </AppButton>
              <AppButton variant="ghost" size="sm" @click="emit('adjust', product, 'ADJUSTMENT')">
                Penyesuaian
              </AppButton>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>