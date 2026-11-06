<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import CategoryForm from '@/components/categories/CategoryForm.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import { useNotification } from '@/composables/useNotification'
import { useAuthStore } from '@/stores/auth.store'
import { useCategoriesStore } from '@/stores/categories.store'
import type { Category, CategoryFilterState, CategoryFormValues } from '@/types/category'
import type { ActiveFilter } from '@/types/product'
import { errorFieldErrors, errorMessage } from '@/utils/errors'
import { formatNumber } from '@/utils/format'
import { PERMISSIONS } from '@/utils/permissions'
import { toCategoryParams } from '@/utils/query'

interface PendingAction {
  type: 'delete' | 'toggle'
  category: Category
}

const auth = useAuthStore()
const categoriesStore = useCategoriesStore()
const notify = useNotification()

const canWrite = computed(() => auth.hasPermission(PERMISSIONS.CATEGORY_WRITE))

const filters = ref<CategoryFilterState>({ search: '', is_active: '' })
const debouncedSearch = useDebouncedRef(computed(() => filters.value.search), 300)
const page = ref(1)

const formOpen = ref(false)
const editing = ref<Category | null>(null)
const formError = ref('')
const fieldErrors = ref<Record<string, string>>({})
const pending = ref<PendingAction | null>(null)

const statusOptions: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: 'Semua status' },
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Nonaktif' },
]

const setStatus = (value: string) => {
  filters.value.is_active = (value === 'true' || value === 'false' ? value : '') as ActiveFilter
}

const load = () => {
  void categoriesStore.fetchCategories(
    toCategoryParams({ ...filters.value, search: debouncedSearch.value }, page.value),
  )
}

watch(
  [debouncedSearch, () => filters.value.is_active],
  () => {
    page.value = 1
  },
)

watch([page, debouncedSearch, () => filters.value.is_active], load)

onMounted(load)

const refresh = () => {
  load()
  void categoriesStore.fetchCategoryOptions()
}

const openCreate = () => {
  editing.value = null
  formError.value = ''
  fieldErrors.value = {}
  formOpen.value = true
}

const openEdit = (category: Category) => {
  editing.value = category
  formError.value = ''
  fieldErrors.value = {}
  formOpen.value = true
}

const submitForm = async (values: CategoryFormValues) => {
  formError.value = ''
  fieldErrors.value = {}

  try {
    if (editing.value) {
      await categoriesStore.updateCategory(editing.value.id, {
        name: values.name,
        description: values.description,
      })
      notify.success('Kategori berhasil diperbarui')
    } else {
      await categoriesStore.createCategory({
        name: values.name,
        description: values.description || undefined,
      })
      notify.success('Kategori berhasil dibuat')
    }

    formOpen.value = false
    refresh()
  } catch (error) {
    fieldErrors.value = errorFieldErrors(error)
    formError.value =
      Object.keys(fieldErrors.value).length > 0
        ? ''
        : errorMessage(error, 'Gagal menyimpan kategori.')
  }
}

const pendingTitle = computed(() => {
  if (pending.value?.type === 'delete') return 'Hapus kategori'
  return pending.value?.category.is_active ? 'Nonaktifkan kategori' : 'Aktifkan kategori'
})

const pendingMessage = computed(() => {
  const action = pending.value
  if (!action) return ''

  if (action.type === 'delete') {
    return `Kategori "${action.category.name}" akan dihapus permanen. Lanjutkan?`
  }

  return action.category.is_active
    ? `Kategori "${action.category.name}" tidak akan dapat dipilih untuk produk baru. Lanjutkan?`
    : `Kategori "${action.category.name}" akan aktif kembali. Lanjutkan?`
})

const pendingLabel = computed(() => {
  if (pending.value?.type === 'delete') return 'Ya, hapus'
  return pending.value?.category.is_active ? 'Nonaktifkan' : 'Aktifkan'
})

const pendingVariant = computed<'primary' | 'danger'>(() => {
  if (pending.value?.type === 'delete') return 'danger'
  return pending.value?.category.is_active ? 'danger' : 'primary'
})

const confirmPending = async () => {
  const action = pending.value
  if (!action) return

  try {
    if (action.type === 'delete') {
      await categoriesStore.deleteCategory(action.category.id)
      notify.success('Kategori berhasil dihapus')
    } else if (action.category.is_active) {
      await categoriesStore.updateCategory(action.category.id, { is_active: false })
      notify.success('Kategori berhasil dinonaktifkan')
    } else {
      await categoriesStore.updateCategory(action.category.id, { is_active: true })
      notify.success('Kategori berhasil diaktifkan')
    }

    refresh()
  } catch (error) {
    notify.error(errorMessage(error, 'Gagal memproses kategori.'))
  } finally {
    pending.value = null
  }
}
</script>

<template>
  <section class="space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-[28px] font-semibold tracking-tight text-ink">Kategori</h1>
        <p class="mt-1 text-sm text-ink-3">Kelola kategori untuk pengelompokan produk.</p>
      </div>
      <AppButton v-if="canWrite" @click="openCreate">Tambah Kategori</AppButton>
    </header>

    <div class="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2">
      <AppInput
        v-model="filters.search"
        label="Cari kategori"
        placeholder="Nama kategori"
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
      <div v-if="categoriesStore.isLoading" class="space-y-3 p-4">
        <SkeletonBlock v-for="index in 5" :key="index" height="2.25rem" />
      </div>

      <ErrorState
        v-else-if="categoriesStore.error"
        :message="categoriesStore.error"
        @retry="load"
      />

      <EmptyState
        v-else-if="categoriesStore.items.length === 0"
        title="Belum ada kategori"
        description="Buat kategori agar produk dapat dikelompokkan."
      >
        <template v-if="canWrite" #action>
          <AppButton size="sm" @click="openCreate">Tambah Kategori</AppButton>
        </template>
      </EmptyState>

      <template v-else>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-ink-3">
                <th scope="col" class="px-4 py-3 font-medium">Nama</th>
                <th scope="col" class="hidden px-4 py-3 font-medium md:table-cell">Deskripsi</th>
                <th scope="col" class="px-4 py-3 font-medium">Jumlah Produk</th>
                <th scope="col" class="px-4 py-3 font-medium">Status</th>
                <th v-if="canWrite" scope="col" class="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-border">
              <tr v-for="category in categoriesStore.items" :key="category.id" class="hover:bg-surface-2">
                <td class="px-4 py-3 font-medium text-ink">{{ category.name }}</td>
                <td class="hidden px-4 py-3 text-ink-2 md:table-cell">
                  {{ category.description || '—' }}
                </td>
                <td class="px-4 py-3 text-ink-2">{{ formatNumber(category.product_count) }}</td>
                <td class="px-4 py-3">
                  <AppBadge :tone="category.is_active ? 'success' : 'neutral'">
                    {{ category.is_active ? 'Aktif' : 'Nonaktif' }}
                  </AppBadge>
                </td>
                <td v-if="canWrite" class="px-4 py-3">
                  <div class="flex justify-end gap-2">
                    <AppButton variant="secondary" size="sm" @click="openEdit(category)">
                      Ubah
                    </AppButton>
                    <AppButton
                      :variant="category.is_active ? 'ghost' : 'secondary'"
                      size="sm"
                      @click="pending = { type: 'toggle', category }"
                    >
                      {{ category.is_active ? 'Nonaktifkan' : 'Aktifkan' }}
                    </AppButton>
                    <AppButton
                      variant="danger"
                      size="sm"
                      @click="pending = { type: 'delete', category }"
                    >
                      Hapus
                    </AppButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <PaginationBar :meta="categoriesStore.meta" @change="page = $event" />
      </template>
    </div>

    <CategoryForm
      :open="formOpen"
      :category="editing"
      :loading="categoriesStore.isSaving"
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
      :loading="categoriesStore.isSaving"
      @confirm="confirmPending"
      @cancel="pending = null"
    />
  </section>
</template>