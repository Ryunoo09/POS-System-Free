<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppModal from '@/components/common/AppModal.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import ReceiptView from '@/components/pos/ReceiptView.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useTransactionsStore } from '@/stores/transactions.store'
import { formatDateTime, formatRupiah } from '@/utils/format'
import { PERMISSIONS } from '@/utils/permissions'
import {
  paymentMethodLabel,
  transactionStatusLabel,
  transactionStatusTone,
} from '@/utils/transactions'

const route = useRoute()
const auth = useAuthStore()
const store = useTransactionsStore()

const transactionId = String(route.params.id ?? '')
const printOpen = ref(false)
const canViewCostPrice = computed(() => auth.hasPermission(PERMISSIONS.COST_PRICE_READ))

const printReceipt = (): void => {
  window.print()
}

const load = (): void => {
  void store.fetchDetail(transactionId)
}

onMounted(load)

onBeforeUnmount(() => {
  store.clearDetail()
})
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <RouterLink
        to="/transactions"
        class="text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        &larr; Kembali ke riwayat
      </RouterLink>

      <AppButton v-if="store.detail" variant="secondary" size="sm" @click="printOpen = true">
        Cetak Ulang
      </AppButton>
    </div>

    <div
      v-if="store.detailLoading"
      class="space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-card"
    >
      <SkeletonBlock v-for="index in 6" :key="index" height="2.25rem" />
    </div>

    <EmptyState
      v-else-if="store.detailNotFound"
      title="Transaksi tidak ditemukan"
      description="Transaksi tidak ada atau bukan milik Anda."
    >
      <template #action>
        <RouterLink
          to="/transactions"
          class="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Kembali ke riwayat
        </RouterLink>
      </template>
    </EmptyState>

    <ErrorState v-else-if="store.detailError" :message="store.detailError" @retry="load" />

    <template v-else-if="store.detail">
      <header class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900">
            {{ store.detail.invoice_number }}
          </h1>
          <p class="mt-1 text-sm text-slate-500">Detail transaksi</p>
        </div>
        <AppBadge :tone="transactionStatusTone(store.detail.status)">
          {{ transactionStatusLabel(store.detail.status) }}
        </AppBadge>
      </header>

      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <dl class="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt class="text-xs uppercase tracking-wide text-slate-500">Invoice</dt>
            <dd class="mt-1 font-medium text-slate-900">{{ store.detail.invoice_number }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-slate-500">Waktu</dt>
            <dd class="mt-1 text-slate-900">{{ formatDateTime(store.detail.created_at) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-slate-500">Kasir</dt>
            <dd class="mt-1 text-slate-900">{{ store.detail.cashier.name }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-slate-500">Metode</dt>
            <dd class="mt-1 text-slate-900">
              {{ paymentMethodLabel(store.detail.payment_method) }}
            </dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-slate-500">Referensi</dt>
            <dd class="mt-1 text-slate-900">{{ store.detail.payment_reference ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-slate-500">Status</dt>
            <dd class="mt-1">
              <AppBadge :tone="transactionStatusTone(store.detail.status)">
                {{ transactionStatusLabel(store.detail.status) }}
              </AppBadge>
            </dd>
          </div>
        </dl>
      </div>

      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div class="border-b border-slate-200 px-4 py-3">
          <h2 class="text-sm font-semibold text-slate-900">Item transaksi</h2>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-slate-500">
                <th scope="col" class="px-4 py-3 font-medium">Produk</th>
                <th scope="col" class="px-4 py-3 text-right font-medium">Qty</th>
                <th scope="col" class="px-4 py-3 text-right font-medium">Harga</th>
                <th scope="col" class="hidden px-4 py-3 text-right font-medium sm:table-cell">
                  Diskon
                </th>
                <th scope="col" class="px-4 py-3 text-right font-medium">Subtotal</th>
                <th
                  v-if="canViewCostPrice"
                  scope="col"
                  class="hidden px-4 py-3 text-right font-medium lg:table-cell"
                >
                  Modal
                </th>
              </tr>
            </thead>

            <tbody class="divide-y divide-slate-100">
              <tr v-for="item in store.detail.items" :key="item.product_id">
                <td class="px-4 py-3">
                  <p class="font-medium text-slate-900">{{ item.product_name }}</p>
                  <p class="mt-0.5 text-xs text-slate-500">{{ item.product_sku }}</p>
                </td>
                <td class="px-4 py-3 text-right text-slate-700">{{ item.quantity }}</td>
                <td class="px-4 py-3 text-right text-slate-700">
                  {{ formatRupiah(item.unit_price) }}
                </td>
                <td class="hidden px-4 py-3 text-right text-slate-700 sm:table-cell">
                  {{ formatRupiah(item.discount_amount) }}
                </td>
                <td class="px-4 py-3 text-right font-medium text-slate-900">
                  {{ formatRupiah(item.subtotal) }}
                </td>
                <td
                  v-if="canViewCostPrice"
                  class="hidden px-4 py-3 text-right text-slate-700 lg:table-cell"
                >
                  {{ item.unit_cost ? formatRupiah(item.unit_cost) : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        class="rounded-xl border border-slate-200 bg-white p-5 shadow-card sm:ml-auto sm:max-w-md"
      >
        <h2 class="text-sm font-semibold text-slate-900">Ringkasan pembayaran</h2>

        <dl class="mt-3 space-y-2 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="text-slate-600">Subtotal</dt>
            <dd class="text-slate-900">{{ formatRupiah(store.detail.subtotal) }}</dd>
          </div>
          <div v-if="Number(store.detail.discount_amount) > 0" class="flex justify-between gap-3">
            <dt class="text-slate-600">Diskon</dt>
            <dd class="text-slate-900">-{{ formatRupiah(store.detail.discount_amount) }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-slate-600">Pajak</dt>
            <dd class="text-slate-900">{{ formatRupiah(store.detail.tax_amount) }}</dd>
          </div>
          <div
            class="flex justify-between gap-3 border-t border-slate-200 pt-2 text-base font-semibold"
          >
            <dt class="text-slate-900">Total</dt>
            <dd class="text-slate-900">{{ formatRupiah(store.detail.total_amount) }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-slate-600">Dibayar</dt>
            <dd class="text-slate-900">{{ formatRupiah(store.detail.amount_paid) }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-slate-600">Kembalian</dt>
            <dd class="text-slate-900">{{ formatRupiah(store.detail.change_amount) }}</dd>
          </div>
        </dl>
      </div>

      <AppModal :open="printOpen" title="Cetak Struk" max-width="md" @close="printOpen = false">
        <ReceiptView v-if="store.detail" :transaction="store.detail" />

        <template #footer>
          <AppButton variant="secondary" @click="printOpen = false">Tutup</AppButton>
          <AppButton @click="printReceipt">Cetak Struk</AppButton>
        </template>
      </AppModal>
    </template>
  </section>
</template>
