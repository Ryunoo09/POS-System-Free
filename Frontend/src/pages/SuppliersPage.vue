<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import SupplierForm from '@/components/suppliers/SupplierForm.vue'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import { useNotification } from '@/composables/useNotification'
import { useAuthStore } from '@/stores/auth.store'
import { useSuppliersStore } from '@/stores/suppliers.store'
import type {
  Supplier,
  SupplierActiveFilter,
  SupplierFilterState,
  SupplierFormValues,
} from '@/types/supplier'
import { errorFieldErrors, errorMessage } from '@/utils/errors'
import { formatNumber } from '@/utils/format'
import { PERMISSIONS } from '@/utils/permissions'
import { toSupplierParams } from '@/utils/query'

interface PendingAction {
  type: 'delete' | 'toggle'
  supplier: Supplier
}

const auth = useAuthStore()
const suppliersStore = useSuppliersStore()
const notify = useNotification()

const canWrite = computed(() => auth.hasPermission(PERMISSIONS.SUPPLIER_WRITE))

const filters = ref<SupplierFilterState>({ search: '', is_active: '' })
const debouncedSearch = useDebouncedRef(computed(() => filters.value.search), 300)
const page = ref(1)

const formOpen = ref(false)
const editing = ref<Supplier | null>(null)
const formError = ref('')
const fieldErrors = ref<Record<string, string>>({})
const pending = ref<PendingAction | null>(null)

const statusOptions: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: 'Semua status' },
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Nonaktif' },
]

const setStatus = (value: string) => {
  filters.value.is_active = (
    value === 'true' || value === 'false' ? value : ''
  ) as SupplierActiveFilter
}

const load = () => {
  void suppliersStore.fetchSuppliers(
    toSupplierParams({ ...filters.value, search: debouncedSearch.value }, page.value),
  )
}

watch([debouncedSearch, () => filters.value.is_active], () => {
  page.value = 1
})

watch([page, debouncedSearch, () => filters.value.is_active], load)

onMounted(load)

const refresh = () => {
  load()
  void suppliersStore.fetchSupplierOptions()
}

const openCreate = () => {
  editing.value = null
  formError.value = ''
  fieldErrors.value = {}
  formOpen.value = true
}

const openEdit = (supplier: Supplier) => {
  editing.value = supplier
  formError.value = ''
  fieldErrors.value = {}
  formOpen.value = true
}

const submitForm = async (values: SupplierFormValues) => {
  formError.value = ''
  fieldErrors.value = {}

  try {
    const payload = {
      name: values.name,
      contact: values.contact || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      address: values.address || undefined,
    }

    if (editing.value) {
      await suppliersStore.updateSupplier(editing.value.id, payload)
      notify.success('Supplier berhasil diperbarui')
    } else {
      await suppliersStore.createSupplier(payload)
      notify.success('Supplier berhasil dibuat')
    }

    formOpen.value = false
    refresh()
  } catch (error) {
    fieldErrors.value = errorFieldErrors(error)
    formError.value =
      Object.keys(fieldErrors.value).length > 0
        ? ''
        : errorMessage(error, 'Gagal menyimpan supplier.')
  }
}

const pendingTitle = computed(() => {
  if (pending.value?.type === 'delete') return 'Hapus supplier'
  return pending.value?.supplier.is_active ? 'Nonaktifkan supplier' : 'Aktifkan supplier'
})

const pendingMessage = computed(() => {
  const action = pending.value
  if (!action) return ''

  if (action.type === 'delete') {
    return `Supplier "${action.supplier.name}" akan dihapus permanen. Lanjutkan?`
  }

  return action.supplier.is_active
    ? `Supplier "${action.supplier.name}" tidak akan dapat dipilih untuk PO baru. Lanjutkan?`
    : `Supplier "${action.supplier.name}" akan aktif kembali. Lanjutkan?`
})

const pendingLabel = computed(() => {
  if (pending.value?.type === 'delete') return 'Ya, hapus'
  return pending.value?.supplier.is_active ? 'Nonaktifkan' : 'Aktifkan'
})

const pendingVariant = computed<'primary' | 'danger'>(() => {
  if (pending.value?.type === 'delete') return 'danger'
  return pending.value?.supplier.is_active ? 'danger' : 'primary'
})

const confirmPending = async () => {
  const action = pending.value
  if (!action) return

  try {
    if (action.type === 'delete') {
      await suppliersStore.deleteSupplier(action.supplier.id)
      notify.success('Supplier berhasil dihapus')
    } else {
      const isActive = !action.supplier.is_active
      await suppliersStore.updateSupplier(action.supplier.id, { is_active: isActive })
      notify.success(`Supplier berhasil di${isActive ? 'aktifkan' : 'nonaktifkan'}`)
    }

    refresh()
  } catch (error) {
    notify.error(errorMessage(error, 'Gagal memproses supplier.'))
  } finally {
    pending.value = null
  }
}
</script>

<template>
  <section class="space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-[28px] font-semibold tracking-tight text-ink">Supplier</h1>
        <p class="mt-1 text-sm text-ink-3">Kelola pemasok untuk pembelian stok.</p>
      </div>
      <AppButton v-if="canWrite" @click="openCreate">Tambah Supplier</AppButton>
    </header>

    <div class="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2">
      <AppInput
        v-model="filters.search"
        label="Cari supplier"
        placeholder="Nama, kontak, atau email"
        inputmode="search"
      />
      <AppSelect
        label="Status"
        :model-value="filters.is_active"
        :options="statusOptions"
        @update:model-value="setStatus"
      />
    </div>

    <div class="overflow-hidden rounded-xl border border-border bg-surface">
      <div v-if="suppliersStore.isLoading" class="space-y-3 p-4">
        <SkeletonBlock v-for="index in 5" :key="index" height="2.25rem" />
      </div>

      <ErrorState v-else-if="suppliersStore.error" :message="suppliersStore.error" @retry="load" />

      <EmptyState
        v-else-if="suppliersStore.items.length === 0"
        title="Belum ada supplier"
        description="Tambahkan supplier agar pembelian stok dapat dicatat."
      >
        <template v-if="canWrite" #action>
          <AppButton size="sm" @click="openCreate">Tambah Supplier</AppButton>
        </template>
      </EmptyState>

      <template v-else>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-ink-3">
                <th scope="col" class="px-4 py-3 font-medium">Nama</th>
                <th scope="col" class="hidden px-4 py-3 font-medium md:table-cell">Kontak</th>
                <th scope="col" class="hidden px-4 py-3 font-medium lg:table-cell">Email</th>
                <th scope="col" class="px-4 py-3 font-medium">PO</th>
                <th scope="col" class="px-4 py-3 font-medium">Status</th>
                <th v-if="canWrite" scope="col" class="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-border">
              <tr
                v-for="supplier in suppliersStore.items"
                :key="supplier.id"
                class="hover:bg-surface-2"
              >
                <td class="px-4 py-3">
                  <p class="font-medium text-ink">{{ supplier.name }}</p>
                  <p class="text-xs text-ink-3">{{ supplier.phone || '—' }}</p>
                </td>
                <td class="hidden px-4 py-3 text-ink-2 md:table-cell">
                  {{ supplier.contact || '—' }}
                </td>
                <td class="hidden px-4 py-3 text-ink-2 lg:table-cell">
                  {{ supplier.email || '—' }}
                </td>
                <td class="px-4 py-3 text-ink-2">
                  {{ formatNumber(supplier.purchase_order_count) }}
                </td>
                <td class="px-4 py-3">
                  <AppBadge :tone="supplier.is_active ? 'success' : 'neutral'">
                    {{ supplier.is_active ? 'Aktif' : 'Nonaktif' }}
                  </AppBadge>
                </td>
                <td v-if="canWrite" class="px-4 py-3">
                  <div class="flex justify-end gap-2">
                    <AppButton variant="secondary" size="sm" @click="openEdit(supplier)">
                      Ubah
                    </AppButton>
                    <AppButton
                      :variant="supplier.is_active ? 'ghost' : 'secondary'"
                      size="sm"
                      @click="pending = { type: 'toggle', supplier }"
                    >
                      {{ supplier.is_active ? 'Nonaktifkan' : 'Aktifkan' }}
                    </AppButton>
                    <AppButton
                      variant="danger"
                      size="sm"
                      @click="pending = { type: 'delete', supplier }"
                    >
                      Hapus
                    </AppButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <PaginationBar :meta="suppliersStore.meta" @change="page = $event" />
      </template>
    </div>

    <SupplierForm
      :open="formOpen"
      :supplier="editing"
      :loading="suppliersStore.isSaving"
      :field-errors="fieldErrors"
      :form-error="formError"
      @close="formOpen = false"
      @submit="submitForm"
    />

    <ConfirmDialog
      :open="Boolean(pending)"
      :title="pendingTitle"
      :message="pendingMessage"
      :confirm-label="pendingLabel"
      :variant="pendingVariant"
      :loading="suppliersStore.isSaving"
      @confirm="confirmPending"
      @cancel="pending = null"
    />
  </section>
</template>