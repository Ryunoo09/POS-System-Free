<script setup lang="ts">
import AppBadge from '@/components/common/AppBadge.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { Shift } from '@/types/shift'
import { formatDateTime, formatRupiah } from '@/utils/format'

defineProps<{
  items: Shift[]
  loading?: boolean
}>()
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-left text-sm">
      <thead class="border-b border-border bg-surface-2 text-xs text-ink-3">
        <tr>
          <th class="px-4 py-3 font-medium">Kasir</th>
          <th class="px-4 py-3 font-medium">Status</th>
          <th class="px-4 py-3 font-medium">Modal Awal</th>
          <th class="px-4 py-3 font-medium">Ekspektasi Kas</th>
          <th class="px-4 py-3 font-medium">Uang Aktual</th>
          <th class="px-4 py-3 font-medium">Selisih</th>
          <th class="px-4 py-3 font-medium">Waktu Buka / Tutup</th>
          <th class="px-4 py-3 font-medium">Catatan</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        <tr v-for="shift in items" :key="shift.id" class="hover:bg-surface-2/50 transition">
          <td class="px-4 py-3 font-medium text-ink">
            {{ shift.cashier.name }}
          </td>
          <td class="px-4 py-3">
            <AppBadge :variant="shift.status === 'OPEN' ? 'success' : 'neutral'">
              {{ shift.status === 'OPEN' ? 'Aktif' : 'Selesai' }}
            </AppBadge>
          </td>
          <td class="px-4 py-3 text-ink">
            {{ formatRupiah(shift.starting_cash) }}
          </td>
          <td class="px-4 py-3 text-ink">
            {{ shift.expected_cash ? formatRupiah(shift.expected_cash) : '-' }}
          </td>
          <td class="px-4 py-3 text-ink">
            {{ shift.actual_cash ? formatRupiah(shift.actual_cash) : '-' }}
          </td>
          <td class="px-4 py-3">
            <template v-if="shift.cash_difference !== null">
              <span
                :class="[
                  Number(shift.cash_difference) === 0
                    ? 'text-accent-ink font-medium'
                    : 'text-danger font-bold',
                ]"
              >
                {{ formatRupiah(shift.cash_difference) }}
              </span>
            </template>
            <span v-else class="text-ink-3">-</span>
          </td>
          <td class="px-4 py-3 text-xs text-ink-2">
            <div>Buka: {{ formatDateTime(shift.opened_at) }}</div>
            <div v-if="shift.closed_at">Tutup: {{ formatDateTime(shift.closed_at) }}</div>
          </td>
          <td class="px-4 py-3 text-xs text-ink-3 max-w-[200px] truncate">
            {{ shift.difference_note || '-' }}
          </td>
        </tr>
        <tr v-if="!loading && items.length === 0">
          <td colspan="8" class="p-8">
            <EmptyState title="Belum ada data shift kasir" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
