<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'

withDefaults(
  defineProps<{
    title: string
    loading?: boolean
    error?: string
    empty?: boolean
    emptyMessage?: string
    skeletonRows?: number
  }>(),
  {
    loading: false,
    error: '',
    empty: false,
    emptyMessage: 'Belum ada data pada periode ini.',
    skeletonRows: 4,
  },
)

const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <section class="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-card">
    <header class="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
      <h2 class="text-sm font-semibold text-slate-900">{{ title }}</h2>
      <slot name="actions" />
    </header>

    <div class="flex-1 p-4">
      <div v-if="loading" class="space-y-3">
        <SkeletonBlock v-for="index in skeletonRows" :key="index" height="2rem" />
      </div>
      <ErrorState v-else-if="error" :message="error" @retry="emit('retry')" />
      <EmptyState v-else-if="empty" title="Belum ada data" :description="emptyMessage" />
      <slot v-else />
    </div>
  </section>
</template>