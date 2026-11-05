<script setup lang="ts">
import { computed } from 'vue'
import type { PaginationMeta } from '@/types/api'
import AppButton from './AppButton.vue'

const props = defineProps<{ meta: PaginationMeta }>()

const emit = defineEmits<{ change: [page: number] }>()

const canPrev = computed(() => props.meta.page > 1)
const canNext = computed(() => props.meta.page < props.meta.total_pages)

const rangeLabel = computed(() => {
  if (props.meta.total_items === 0) return 'Tidak ada data'

  const start = (props.meta.page - 1) * props.meta.limit + 1
  const end = Math.min(props.meta.page * props.meta.limit, props.meta.total_items)

  return `${start}–${end} dari ${props.meta.total_items}`
})

const totalPages = computed(() => Math.max(props.meta.total_pages, 1))
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
    <p class="text-xs text-slate-500">{{ rangeLabel }}</p>

    <div class="flex items-center gap-2">
      <AppButton
        variant="secondary"
        size="sm"
        :disabled="!canPrev"
        @click="emit('change', meta.page - 1)"
      >
        Sebelumnya
      </AppButton>
      <span class="text-xs text-slate-500">Halaman {{ meta.page }} dari {{ totalPages }}</span>
      <AppButton
        variant="secondary"
        size="sm"
        :disabled="!canNext"
        @click="emit('change', meta.page + 1)"
      >
        Berikutnya
      </AppButton>
    </div>
  </div>
</template>