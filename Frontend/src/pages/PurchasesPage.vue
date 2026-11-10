<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import PurchaseOrderForm from '@/components/purchases/PurchaseOrderForm.vue'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import { useNotification } from '@/composables/useNotification'
import { useAuthStore } from '@/stores/auth.store'
import { useProductsStore } from '@/stores/products.store'
import { usePurchasesStore } from '@/stores/purchases.store'
import { useSuppliersStore } from '@/stores/suppliers.store'
import type {
  PurchaseOrder,
  PurchaseOrderFilterState,
  PurchaseOrderFormValues,
  PurchaseOrderStatus,
} from '@/types/purchase'
import { errorFieldErrors, errorMessage } from '@/utils/errors'
import { formatDate, formatRupiah } from '@/utils/format'
import { PERMISSIONS } from '@/utils/permissions'
import { toPurchaseParams } from '@/utils/query'

type PendingType = 'order' | 'receive' | 'cancel'

interface PendingAction {
  type: PendingType
  order: PurchaseOrder
}

const auth = useAuthStore()
const purchasesStore = usePurchasesStore()
const suppliersStore = useSuppliersStore()
const productsStore = useProductsStore()
const notify = useNotification()

const canWrite = computed(() => auth.hasPermission(PERMISSIONS.PURCHASE_WRITE))

const filters = ref<PurchaseOrderFilterState>({ search: '', status: '', supplier_id: '' })
const debouncedSearch = useDebouncedRef(computed(() => filters.value.search), 300)
const page = ref(1)

const formOpen = ref(false)
const formError = ref('')
const fieldErrors = ref<Record<string, string>>({})
const pending = ref<PendingAction | null>(null)
const detail = ref<PurchaseOrder | null>(null)

const statusOptions: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: 'Semua status' },
  { value: 'DRAFT', label: 'Draf' },
  { value: 'ORDERED', label: 'Dipesan' },
  { value: 'RECEIVED', label: 'Diterima' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
]

const statusLabels: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'Draf',
  ORDERED: 'Dipesan',
  RECEIVED: 'Diterima',
  CANCELLED: 'Dibatalkan',
}

const statusTones: Record<PurchaseOrderStatus, 'success' | 'danger' | 'warning' | 'neutral'> = {
  DRAFT: 'neutral',
  ORDERED: 'warning',
  RECEIVED: 'success',
  CANCELLED: 'danger',
}

const supplierOptions = computed(() => [
  { value: '', label: 'Semua supplier' },
  ...suppliersStore.options.map((supplier) => ({ value: supplier.id, label: supplier.name })),
])

const formSuppliers = computed(() =>
  suppliersStore.options.map((supplier) => ({ id: supplier.id, name: supplier.name })),
)

const formProducts = computed(() =>
  productsStore.options.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    cost_price: product.cost_price,
  })),
)

const setStatus = (value: string) => {
  filters.value.status = (
    value === 'DRAFT' || value === 'ORDERED' || value === 'RECEIVED' || value === 'CANCELLED'
      ? value
      : ''
  ) as '' | PurchaseOrderStatus
}

const load = () => {
  void purchasesStore.fetchPurchaseOrders(
    toPurchaseParams({ ...filters.value, search: debouncedSearch.value }, page.value),
  )
}

watch([debouncedSearch, () => filters.value.status, () => filters.value.supplier_id], () => {
  page.value = 1
})

watch([page, debouncedSearch, () => filters.value.status, () => filters.value.supplier_id], load)

onMounted(() => {
  load()
  void suppliersStore.fetchSupplierOptions()
  void productsStore.fetchProductOptions()
})

const refresh = () => {
  load()
}

const openCreate = () => {
  formError.value = ''
  fieldErrors.value = {}
  formOpen.value = true
}

const submitForm = async (values: PurchaseOrderFormValues) => {
  formError.value = ''
  fieldErrors.value = {}

  try {
    await purchasesStore.createPurchaseOrder({
      supplier_id: values.supplier_id,
      notes: values.notes || undefined,
      items: values.items,
    })
    notify.success('Purchase order berhasil dibuat')
    formOpen.value = false
    refresh()
  } catch (error) {
    fieldErrors.value = errorFieldErrors(error)
    formError.value =
      Object.keys(fieldErrors.value).length > 0
        ? ''
        : errorMessage(error, 'Gagal membuat purchase order.')
  }
}

const pendingTitle = computed(() => {
  if (pending.value?.type === 'receive') return 'Terima barang'
  if (pending.value?.type === 'cancel') return 'Batalkan purchase order'
  return 'Tandai dipesan'
})

const pendingMessage = computed(() => {
  const action = pending.value
  if (!action) return ''

  if (action.type === 'receive') {
    return `Barang dari PO ${action.order.po_number} akan diterima. Stok produk bertambah dan harga beli diperbarui sesuai PO. Lanjutkan?`
  }

  if (action.type === 'cancel') {
    return `PO ${action.order.po_number} akan dibatalkan dan tidak dapat diterima lagi. Lanjutkan?`
  }

  return `Tandai PO ${action.order.po_number} sebagai dipesan ke supplier?`
})

const pendingLabel = computed(() => {
  if (pending.value?.type === 'receive') return 'Ya, terima'
  if (pending.value?.type === 'cancel') return 'Ya, batalkan'
  return 'Tandai dipesan'
})

const pendingVariant = computed<'primary' | 'danger'>(() =>
  pending.value?.type === 'cancel' ? 'danger' : 'primary',
)

const confirmPending = async () => {
  const action = pending.value
  if (!action) return

  try {
    if (action.type === 'receive') {
      await purchasesStore.receivePurchaseOrder(action.order.id)
      notify.success('Penerimaan barang berhasil dicatat')
    } else if (action.type === 'cancel') {
      await purchasesStore.cancelPurchaseOrder(action.order.id)
      notify.success('Purchase order dibatalkan')
    } else {
      await purchasesStore.orderPurchaseOrder(action.order.id)
      notify.success('Purchase order ditandai dipesan')
    }

    refresh()
  } catch (error) {
    notify.error(errorMessage(error, 'Gagal memproses purchase order.'))
  } finally {
    pending.value = null
  }
}
</script>

<template>
  <section class="space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-[28px] font-semibold tracking-tight text-ink">Pembelian</h1>
        <p class="mt-1 text-sm text-ink-3">Catat purchase order dan penerimaan barang dari supplier.</p>
      </div>
      <AppButton v-if="canWrite" @click="openCreate">Buat PO</AppButton>
    </header>

    <div class="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-3">
      <AppInput
        v-model="filters.search"
        label="Cari PO"
        placeholder="Nomor PO atau supplier"
        inputmode="search"
      />
      <AppSelect
        label="Status"
        :model-value="filters.status"
        :options="statusOptions"
        @update:model-value="setStatus"
      />
      <AppSelect
        v-model="filters.supplier_id"
        label="Supplier"
        :options="supplierOptions"
      />
    </div>

    <div class="overflow-hidden rounded-xl border border-border bg-surface">
      <div v-if="purchasesStore.isLoading" class="space-y-3 p-4">
        <SkeletonBlock v-for="index in 5" :key="index" height="2.25rem" />
      </div>

      <ErrorState v-else-if="purchasesStore.error" :message="purchasesStore.error" @retry="load" />

      <EmptyState
        v-else-if="purchasesStore.items.length === 0"
        title="Belum ada purchase order"
        description="Buat PO untuk mencatat pembelian stok dari supplier."
      >
        <template v-if="canWrite" #action>
          <AppButton size="sm" @click="openCreate">Buat PO</AppButton>
        </template>
      </EmptyState>

      <template v-else>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-ink-3">
                <th scope="col" class="px-4 py-3 font-medium">Nomor PO</th>
                <th scope="col" class="px-4 py-3 font-medium">Supplier</th>
                <th scope="col" class="hidden px-4 py-3 font-medium md:table-cell">Tanggal</th>
                <th scope="col" class="px-4 py-3 text-right font-medium">Total</th>
                <th scope="col" class="px-4 py-3 font-medium">Status</th>
                <th scope="col" class="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-border">
              <tr v-for="order in purchasesStore.items" :key="order.id" class="hover:bg-surface-2">
                <td class="px-4 py-3 font-medium text-ink">{{ order.po_number }}</td>
                <td class="px-4 py-3 text-ink-2">{{ order.supplier.name }}</td>
                <td class="hidden px-4 py-3 text-ink-2 md:table-cell">
                  {{ formatDate(order.created_at) }}
                </td>
                <td class="px-4 py-3 text-right text-ink-2">{{ formatRupiah(order.total_amount) }}</td>
                <td class="px-4 py-3">
                  <AppBadge :tone="statusTones[order.status]">
                    {{ statusLabels[order.status] }}
                  </AppBadge>
                </td>
                <td class="px-4 py-3">
                  <div class="flex justify-end gap-2">
                    <AppButton variant="ghost" size="sm" @click="detail = order">Rincian</AppButton>
                    <AppButton
                      v-if="canWrite && order.status === 'DRAFT'"
                      variant="secondary"
                      size="sm"
                      @click="pending = { type: 'order', order }"
                    >
                      Pesan
                    </AppButton>
                    <AppButton
                      v-if="canWrite && (order.status === 'DRAFT' || order.status === 'ORDERED')"
                      variant="primary"
                      size="sm"
                      @click="pending = { type: 'receive', order }"
                    >
                      Terima
                    </AppButton>
                    <AppButton
                      v-if="canWrite && (order.status === 'DRAFT' || order.status === 'ORDERED')"
                      variant="danger"
                      size="sm"
                      @click="pending = { type: 'cancel', order }"
                    >
                      Batal
                    </AppButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <PaginationBar :meta="purchasesStore.meta" @change="page = $event" />
      </template>
    </div>

    <PurchaseOrderForm
      :open="formOpen"
      :suppliers="formSuppliers"
      :products="formProducts"
      :loading="purchasesStore.isSaving"
      :field-errors="fieldErrors"
      :form-error="formError"
      @close="formOpen = false"
      @submit="submitForm"
    />

    <AppModal :open="Boolean(detail)" title="Rincian Purchase Order" max-width="lg" @close="detail = null">
      <div v-if="detail" class="space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p class="text-sm font-semibold text-ink">{{ detail.po_number }}</p>
            <p class="text-xs text-ink-3">{{ detail.supplier.name }}</p>
          </div>
          <AppBadge :tone="statusTones[detail.status]">{{ statusLabels[detail.status] }}</AppBadge>
        </div>

        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-ink-3">
                <th scope="col" class="px-3 py-2 font-medium">Produk</th>
                <th scope="col" class="px-3 py-2 text-right font-medium">Qty</th>
                <th scope="col" class="px-3 py-2 text-right font-medium">Harga beli</th>
                <th scope="col" class="px-3 py-2 text-right font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="item in detail.items" :key="item.id">
                <td class="px-3 py-2">
                  <p class="font-medium text-ink">{{ item.product_name }}</p>
                  <p class="text-xs text-ink-3">{{ item.product_sku }}</p>
                </td>
                <td class="px-3 py-2 text-right text-ink-2">{{ item.quantity }}</td>
                <td class="px-3 py-2 text-right text-ink-2">{{ formatRupiah(item.cost_price) }}</td>
                <td class="px-3 py-2 text-right text-ink-2">{{ formatRupiah(item.subtotal) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex items-center justify-between rounded-lg bg-surface-2 px-4 py-3">
          <span class="text-sm font-medium text-ink-2">Total</span>
          <span class="text-base font-semibold text-ink">{{ formatRupiah(detail.total_amount) }}</span>
        </div>

        <p v-if="detail.notes" class="text-sm text-ink-2">Catatan: {{ detail.notes }}</p>
      </div>

      <template #footer>
        <AppButton variant="secondary" @click="detail = null">Tutup</AppButton>
      </template>
    </AppModal>

    <ConfirmDialog
      :open="Boolean(pending)"
      :title="pendingTitle"
      :message="pendingMessage"
      :confirm-label="pendingLabel"
      :variant="pendingVariant"
      :loading="purchasesStore.isSaving"
      @confirm="confirmPending"
      @cancel="pending = null"
    />
  </section>
</template>