<script setup lang="ts">
import { computed } from 'vue'
import AppBadge from '@/components/common/AppBadge.vue'
import type { StockOpnameStatus } from '@/types/stock-opname'

const props = defineProps<{ status: StockOpnameStatus }>()

const labels: Record<StockOpnameStatus, string> = {
  DRAFT: 'Draft',
  IN_PROGRESS: 'Berjalan',
  SUBMITTED: 'Menunggu Approval',
  APPROVED: 'Disetujui',
  COMPLETED: 'Selesai',
  REJECTED: 'Ditolak',
  CANCELLED: 'Dibatalkan',
}

const tones: Record<StockOpnameStatus, 'success' | 'danger' | 'warning' | 'neutral'> = {
  DRAFT: 'neutral',
  IN_PROGRESS: 'warning',
  SUBMITTED: 'warning',
  APPROVED: 'success',
  COMPLETED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
}

const label = computed(() => labels[props.status])
const tone = computed(() => tones[props.status])
</script>

<template>
  <AppBadge :tone="tone">{{ label }}</AppBadge>
</template>