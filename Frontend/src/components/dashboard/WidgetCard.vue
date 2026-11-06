<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'

withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    loading?: boolean
    error?: string
    empty?: boolean
    emptyMessage?: string
    skeletonRows?: number
  }>(),
  {
    subtitle: '',
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
  <section class="flex h-full min-w-0 flex-col rounded-xl border border-border bg-surface">
    <header class="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
      <div class="min-w-0">
        <h2 class="text-sm font-semibold text-ink">{{ title }}</h2>
        <p v-if="subtitle" class="mt-0.5 text-xs text-ink-3">{{ subtitle }}</p>
      </div>
      <slot name="actions" />
    </header>

    <div class="min-w-0 flex-1 px-4 pb-4">
      <div v-if="loading" class="space-y-3">
        <p class="sr-only" role="status">Memuat data…</p>
        <SkeletonBlock v-for="index in skeletonRows" :key="index" height="2rem" />
      </div>
      <ErrorState v-else-if="error" :message="error" @retry="emit('retry')" />
      <EmptyState v-else-if="empty" title="Belum ada data" :description="emptyMessage" />
      <slot v-else />
    </div>
  </section>
</template>