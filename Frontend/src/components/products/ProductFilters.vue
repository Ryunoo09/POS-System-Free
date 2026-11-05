<script setup lang="ts">
import { computed } from 'vue'
import AppInput from '@/components/common/AppInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import type { ActiveFilter, ProductFilterState } from '@/types/product'

const model = defineModel<ProductFilterState>({ required: true })

const props = defineProps<{
  categories: ReadonlyArray<{ value: string; label: string }>
}>()

const categoryOptions = computed(() => [
  { value: '', label: 'Semua kategori' },
  ...props.categories,
])

const statusOptions: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: 'Semua status' },
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Nonaktif' },
]

const update = (patch: Partial<ProductFilterState>) => {
  model.value = { ...model.value, ...patch }
}

const toActiveFilter = (value: string): ActiveFilter => {
  if (value === 'true' || value === 'false') return value
  return ''
}

const setSearch = (value: string | number) => update({ search: String(value) })
const setCategory = (value: string) => update({ category_id: value })
const setStatus = (value: string) => update({ is_active: toActiveFilter(value) })
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <AppInput
      label="Cari produk"
      :model-value="model.search"
      placeholder="Nama, SKU, atau barcode"
      inputmode="search"
      @update:model-value="setSearch"
    />

    <AppSelect
      label="Kategori"
      :model-value="model.category_id"
      :options="categoryOptions"
      @update:model-value="setCategory"
    />

    <AppSelect
      label="Status"
      :model-value="model.is_active"
      :options="statusOptions"
      @update:model-value="setStatus"
    />
  </div>
</template>