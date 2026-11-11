<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import ErrorState from '@/components/common/ErrorState.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import OpnameStatusBadge from '@/components/stock-opname/OpnameStatusBadge.vue'
import { useStockOpnamesStore } from '@/stores/stock-opnames.store'
import type { StockOpnameScope } from '@/types/stock-opname'
import { formatDateTime, formatNumber } from '@/utils/format'

const scopeLabels: Record<StockOpnameScope, string> = {
  ALL: 'Semua produk',
  CATEGORY: 'Kategori',
  PRODUCT: 'Produk tertentu',
}

const route = useRoute()
const store = useStockOpnamesStore()

const sessionId = computed(() => String(route.params.id ?? ''))
const session = computed(() => store.detail)

const load = (): void => {
  if (sessionId.value) void store.fetchDetail(sessionId.value)
}

onMounted(load)
</script>

<template>
  <section class="space-y-6">
    <div>
      <RouterLink to="/stock-opnames" class="text-sm text-ink-3 hover:text-ink">
        ← Kembali ke daftar
      </RouterLink>
    </div>

    <div v-if="store.isLoading && !session" class="space-y-3">
      <SkeletonBlock height="3rem" />
      <SkeletonBlock height="6rem" />
      <SkeletonBlock height="12rem" />
    </div>

    <ErrorState v-else-if="store.error && !session" :message="store.error" @retry="load" />

    <template v-else-if="session">
      <header class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-[28px] font-semibold tracking-tight text-ink">{{ session.name }}</h1>
            <OpnameStatusBadge :status="session.status" />
          </div>
          <p class="mt-1 text-sm text-ink-3">
            {{ session.session_number }} · {{ scopeLabels[session.scope] }} · dibuat
            {{ session.created_by.name }} pada {{ formatDateTime(session.created_at) }}
          </p>
          <p v-if="session.notes" class="mt-2 text-sm text-ink-2">{{ session.notes }}</p>
        </div>
      </header>

      <p
        v-if="session.rejection_reason"
        class="rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning"
      >
        Ditolak: {{ session.rejection_reason }}
      </p>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-xl border border-border bg-surface p-4">
          <p class="text-xs uppercase tracking-wide text-ink-3">Progres</p>
          <p class="mt-1 text-lg font-semibold text-ink">
            {{ session.counted_items }} / {{ session.total_items }}
          </p>
        </div>
        <div class="rounded-xl border border-border bg-surface p-4">
          <p class="text-xs uppercase tracking-wide text-ink-3">Selisih lebih</p>
          <p class="mt-1 text-lg font-semibold text-accent">{{ session.positive_differences }}</p>
        </div>
        <div class="rounded-xl border border-border bg-surface p-4">
          <p class="text-xs uppercase tracking-wide text-ink-3">Selisih kurang</p>
          <p class="mt-1 text-lg font-semibold text-negative">{{ session.negative_differences }}</p>
        </div>
        <div class="rounded-xl border border-border bg-surface p-4">
          <p class="text-xs uppercase tracking-wide text-ink-3">Total penyesuaian</p>
          <p class="mt-1 text-lg font-semibold text-ink">
            {{ formatNumber(session.total_adjustment_quantity) }}
          </p>
        </div>
      </div>

      <div class="overflow-hidden rounded-xl border border-border bg-surface">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-ink-3">
                <th scope="col" class="px-4 py-3 font-medium">Produk</th>
                <th scope="col" class="px-4 py-3 font-medium">Sistem</th>
                <th scope="col" class="px-4 py-3 font-medium">Fisik</th>
                <th scope="col" class="px-4 py-3 font-medium">Selisih</th>
                <th scope="col" class="hidden px-4 py-3 font-medium md:table-cell">Alasan</th>
                <th scope="col" class="hidden px-4 py-3 font-medium lg:table-cell">
                  Dihitung oleh
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="item in session.items" :key="item.id" class="hover:bg-surface-2">
                <td class="px-4 py-3">
                  <p class="font-medium text-ink">{{ item.name }}</p>
                  <p class="text-xs text-ink-3">{{ item.sku }}</p>
                </td>
                <td class="px-4 py-3 text-ink-2">{{ formatNumber(item.system_stock) }}</td>
                <td class="px-4 py-3 text-ink-2">
                  {{ item.physical_stock === null ? '—' : formatNumber(item.physical_stock) }}
                </td>
                <td class="px-4 py-3">
                  <span
                    v-if="item.difference !== null"
                    :class="item.difference === 0 ? 'text-ink-2' : item.difference > 0 ? 'text-accent' : 'text-negative'"
                  >
                    {{ item.difference > 0 ? '+' : '' }}{{ formatNumber(item.difference) }}
                  </span>
                  <span v-else class="text-ink-3">—</span>
                </td>
                <td class="hidden px-4 py-3 text-ink-2 md:table-cell">{{ item.reason ?? '—' }}</td>
                <td class="hidden px-4 py-3 text-ink-2 lg:table-cell">
                  <template v-if="item.counted_by">
                    <p>{{ item.counted_by.name }}</p>
                    <p class="text-xs text-ink-3">{{ formatDateTime(item.counted_at ?? '') }}</p>
                  </template>
                  <span v-else>—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </section>
</template>