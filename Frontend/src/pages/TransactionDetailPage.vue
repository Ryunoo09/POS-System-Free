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
import ReturnRequestDialog from '@/components/returns/ReturnRequestDialog.vue'
import { useNotification } from '@/composables/useNotification'
import { useAuthStore } from '@/stores/auth.store'
import { useReturnsStore } from '@/stores/returns.store'
import { useTransactionsStore } from '@/stores/transactions.store'
import type { ReturnCreatePayload, ReturnRecord } from '@/types/return'
import { errorFieldErrors, errorMessage } from '@/utils/errors'
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
const returnsStore = useReturnsStore()
const notification = useNotification()

const transactionId = String(route.params.id ?? '')
const printOpen = ref(false)
const returnOpen = ref(false)
const existingReturns = ref<ReturnRecord[]>([])
const returnsLoading = ref(false)
const returnsError = ref('')
const canViewCostPrice = computed(() => auth.hasPermission(PERMISSIONS.COST_PRICE_READ))
const canCreateReturn = computed(() => auth.hasPermission(PERMISSIONS.RETURN_CREATE))

const printReceipt = (): void => {
  window.print()
}

const openReturn = (): void => {
  returnOpen.value = true
  returnsError.value = ''
  existingReturns.value = []
  returnsLoading.value = true

  void returnsStore
    .fetchForTransaction(transactionId)
    .then((records) => {
      existingReturns.value = records
    })
    .catch(() => {
      returnsError.value = 'Gagal memuat riwayat retur. Batas kuantitas tetap divalidasi server.'
    })
    .finally(() => {
      returnsLoading.value = false
    })
}

const submitReturn = async (payload: ReturnCreatePayload): Promise<void> => {
  returnsError.value = ''

  try {
    const record = await returnsStore.createReturn(payload)
    notification.success(`Retur ${record.return_number} berhasil dibuat`)
    existingReturns.value = [...existingReturns.value, record]
    returnOpen.value = false
  } catch (err) {
    const fieldErrors = Object.values(errorFieldErrors(err))
    returnsError.value =
      fieldErrors[0] ?? errorMessage(err, 'Gagal membuat retur. Silakan coba lagi.')
  }
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
        class="text-sm font-medium text-ink-2 hover:text-ink"
      >
        &larr; Kembali ke riwayat
      </RouterLink>

      <div v-if="store.detail" class="flex flex-wrap gap-2">
        <AppButton
          v-if="canCreateReturn && store.detail.status === 'COMPLETED'"
          variant="accent"
          size="sm"
          @click="openReturn"
        >
          Ajukan Retur
        </AppButton>
        <AppButton variant="secondary" size="sm" @click="printOpen = true">
          Cetak Ulang
        </AppButton>
      </div>
    </div>

    <div
      v-if="store.detailLoading"
      class="space-y-3 rounded-xl border border-border bg-surface p-6"
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
          class="inline-flex h-8 items-center rounded-lg border border-border bg-surface px-3 text-xs font-medium text-ink-2 hover:bg-surface-2"
        >
          Kembali ke riwayat
        </RouterLink>
      </template>
    </EmptyState>

    <ErrorState v-else-if="store.detailError" :message="store.detailError" @retry="load" />

    <template v-else-if="store.detail">
      <header class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-[28px] font-semibold tracking-tight text-ink">
            {{ store.detail.invoice_number }}
          </h1>
          <p class="mt-1 text-sm text-ink-3">Detail transaksi</p>
        </div>
        <AppBadge :tone="transactionStatusTone(store.detail.status)">
          {{ transactionStatusLabel(store.detail.status) }}
        </AppBadge>
      </header>

      <div class="rounded-xl border border-border bg-surface p-5">
        <dl class="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt class="text-xs uppercase tracking-wide text-ink-3">Invoice</dt>
            <dd class="mt-1 font-medium text-ink">{{ store.detail.invoice_number }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-ink-3">Waktu</dt>
            <dd class="mt-1 text-ink">{{ formatDateTime(store.detail.created_at) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-ink-3">Kasir</dt>
            <dd class="mt-1 text-ink">{{ store.detail.cashier.name }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-ink-3">Metode</dt>
            <dd class="mt-1 text-ink">
              {{ paymentMethodLabel(store.detail.payment_method) }}
            </dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-ink-3">Referensi</dt>
            <dd class="mt-1 text-ink">{{ store.detail.payment_reference ?? '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wide text-ink-3">Status</dt>
            <dd class="mt-1">
              <AppBadge :tone="transactionStatusTone(store.detail.status)">
                {{ transactionStatusLabel(store.detail.status) }}
              </AppBadge>
            </dd>
          </div>
        </dl>
      </div>

      <div class="overflow-hidden rounded-xl border border-border bg-surface">
        <div class="border-b border-border px-4 py-3">
          <h2 class="text-sm font-semibold text-ink">Item transaksi</h2>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-ink-3">
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

            <tbody class="divide-y divide-border">
              <tr v-for="item in store.detail.items" :key="item.product_id">
                <td class="px-4 py-3">
                  <p class="font-medium text-ink">{{ item.product_name }}</p>
                  <p class="mt-0.5 text-xs text-ink-3">{{ item.product_sku }}</p>
                </td>
                <td class="px-4 py-3 text-right text-ink-2">{{ item.quantity }}</td>
                <td class="px-4 py-3 text-right text-ink-2">
                  {{ formatRupiah(item.unit_price) }}
                </td>
                <td class="hidden px-4 py-3 text-right text-ink-2 sm:table-cell">
                  {{ formatRupiah(item.discount_amount) }}
                </td>
                <td class="px-4 py-3 text-right font-medium text-ink">
                  {{ formatRupiah(item.subtotal) }}
                </td>
                <td
                  v-if="canViewCostPrice"
                  class="hidden px-4 py-3 text-right text-ink-2 lg:table-cell"
                >
                  {{ item.unit_cost ? formatRupiah(item.unit_cost) : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        class="rounded-xl border border-border bg-surface p-5 sm:ml-auto sm:max-w-md"
      >
        <h2 class="text-sm font-semibold text-ink">Ringkasan pembayaran</h2>

        <dl class="mt-3 space-y-2 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="text-ink-2">Subtotal</dt>
            <dd class="text-ink">{{ formatRupiah(store.detail.subtotal) }}</dd>
          </div>
          <div v-if="Number(store.detail.discount_amount) > 0" class="flex justify-between gap-3">
            <dt class="text-ink-2">Diskon</dt>
            <dd class="text-ink">-{{ formatRupiah(store.detail.discount_amount) }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-ink-2">Pajak</dt>
            <dd class="text-ink">{{ formatRupiah(store.detail.tax_amount) }}</dd>
          </div>
          <div
            class="flex justify-between gap-3 border-t border-border pt-2 text-base font-semibold"
          >
            <dt class="text-ink">Total</dt>
            <dd class="text-ink">{{ formatRupiah(store.detail.total_amount) }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-ink-2">Dibayar</dt>
            <dd class="text-ink">{{ formatRupiah(store.detail.amount_paid) }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-ink-2">Kembalian</dt>
            <dd class="text-ink">{{ formatRupiah(store.detail.change_amount) }}</dd>
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

      <ReturnRequestDialog
        :open="returnOpen"
        :transaction="store.detail"
        :existing-returns="existingReturns"
        :loading-existing="returnsLoading"
        :is-saving="returnsStore.isSaving"
        :server-error="returnsError"
        @close="returnOpen = false"
        @submit="submitReturn"
      />
    </template>
  </section>
</template>
