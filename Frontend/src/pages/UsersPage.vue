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
import UserForm from '@/components/users/UserForm.vue'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import { useNotification } from '@/composables/useNotification'
import { useAuthStore } from '@/stores/auth.store'
import { useUsersStore } from '@/stores/users.store'
import type { Role } from '@/types/auth'
import type { ActiveFilter } from '@/types/product'
import type { User, UserFilterState, UserFormValues } from '@/types/user'
import { errorFieldErrors, errorMessage } from '@/utils/errors'
import { toUserParams } from '@/utils/query'

const auth = useAuthStore()
const usersStore = useUsersStore()
const notify = useNotification()

const roleLabels: Record<Role, string> = {
  ADMIN: 'Admin',
  OWNER: 'Owner',
  CASHIER: 'Kasir',
}

const roleOptions: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: 'Semua role' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'OWNER', label: 'Owner' },
  { value: 'CASHIER', label: 'Kasir' },
]

const statusOptions: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: 'Semua status' },
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Nonaktif' },
]

const filters = ref<UserFilterState>({ search: '', role: '', is_active: '' })
const debouncedSearch = useDebouncedRef(computed(() => filters.value.search), 300)
const page = ref(1)

const formOpen = ref(false)
const editing = ref<User | null>(null)
const formError = ref('')
const fieldErrors = ref<Record<string, string>>({})
const toggleTarget = ref<User | null>(null)

const setRole = (value: string) => {
  if (value === 'ADMIN' || value === 'OWNER' || value === 'CASHIER') {
    filters.value.role = value
  } else {
    filters.value.role = ''
  }
}

const setStatus = (value: string) => {
  filters.value.is_active = (value === 'true' || value === 'false' ? value : '') as ActiveFilter
}

const isSelf = (user: User): boolean => user.id === auth.user?.id

const load = () => {
  void usersStore.fetchUsers(
    toUserParams({ ...filters.value, search: debouncedSearch.value }, page.value),
  )
}

watch(
  [debouncedSearch, () => filters.value.role, () => filters.value.is_active],
  () => {
    page.value = 1
  },
)

watch([page, debouncedSearch, () => filters.value.role, () => filters.value.is_active], load)

onMounted(load)

const openCreate = () => {
  editing.value = null
  formError.value = ''
  fieldErrors.value = {}
  formOpen.value = true
}

const openEdit = (user: User) => {
  editing.value = user
  formError.value = ''
  fieldErrors.value = {}
  formOpen.value = true
}

const submitForm = async (values: UserFormValues) => {
  formError.value = ''
  fieldErrors.value = {}

  try {
    if (editing.value) {
      await usersStore.updateUser(editing.value.id, {
        name: values.name,
        role: values.role,
        ...(values.password ? { password: values.password } : {}),
      })
      notify.success('Pengguna berhasil diperbarui')
    } else {
      await usersStore.createUser({
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role,
      })
      notify.success('Pengguna berhasil dibuat')
    }

    formOpen.value = false
    load()
  } catch (error) {
    fieldErrors.value = errorFieldErrors(error)
    formError.value =
      Object.keys(fieldErrors.value).length > 0
        ? ''
        : errorMessage(error, 'Gagal menyimpan pengguna.')
  }
}

const toggleMessage = computed(() => {
  const user = toggleTarget.value
  if (!user) return ''

  return user.is_active
    ? `Pengguna "${user.name}" akan dinonaktifkan dan tidak dapat masuk. Lanjutkan?`
    : `Pengguna "${user.name}" akan diaktifkan kembali. Lanjutkan?`
})

const confirmToggle = async () => {
  const user = toggleTarget.value
  if (!user) return

  try {
    await usersStore.updateUser(user.id, { is_active: !user.is_active })
    notify.success(user.is_active ? 'Pengguna berhasil dinonaktifkan' : 'Pengguna berhasil diaktifkan')
    load()
  } catch (error) {
    notify.error(errorMessage(error, 'Gagal memperbarui status pengguna.'))
  } finally {
    toggleTarget.value = null
  }
}
</script>

<template>
  <section class="space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-[28px] font-semibold tracking-tight text-ink">Pengguna</h1>
        <p class="mt-1 text-sm text-ink-3">Kelola akun admin, owner, dan kasir.</p>
      </div>
      <AppButton @click="openCreate">Tambah Pengguna</AppButton>
    </header>

    <div class="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-3">
      <AppInput
        v-model="filters.search"
        label="Cari pengguna"
        placeholder="Nama atau email"
        inputmode="search"
      />
      <AppSelect
        label="Role"
        :model-value="filters.role"
        :options="roleOptions"
        @update:model-value="setRole"
      />
      <AppSelect
        label="Status"
        :model-value="filters.is_active"
        :options="statusOptions"
        @update:model-value="setStatus"
      />
    </div>

    <div class="overflow-hidden rounded-xl border border-border bg-surface">
      <div v-if="usersStore.isLoading" class="space-y-3 p-4">
        <SkeletonBlock v-for="index in 5" :key="index" height="2.25rem" />
      </div>

      <ErrorState v-else-if="usersStore.error" :message="usersStore.error" @retry="load" />

      <EmptyState
        v-else-if="usersStore.items.length === 0"
        title="Belum ada pengguna"
        description="Tambahkan pengguna untuk mengelola toko."
      >
        <template #action>
          <AppButton size="sm" @click="openCreate">Tambah Pengguna</AppButton>
        </template>
      </EmptyState>

      <template v-else>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-ink-3">
                <th scope="col" class="px-4 py-3 font-medium">Nama</th>
                <th scope="col" class="px-4 py-3 font-medium">Email</th>
                <th scope="col" class="px-4 py-3 font-medium">Role</th>
                <th scope="col" class="px-4 py-3 font-medium">Status</th>
                <th scope="col" class="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-border">
              <tr v-for="user in usersStore.items" :key="user.id" class="hover:bg-surface-2">
                <td class="px-4 py-3 font-medium text-ink">
                  {{ user.name }}
                  <span v-if="isSelf(user)" class="ml-1 text-xs font-normal text-ink-3">
                    (Anda)
                  </span>
                </td>
                <td class="px-4 py-3 text-ink-2">{{ user.email }}</td>
                <td class="px-4 py-3 text-ink-2">{{ roleLabels[user.role] }}</td>
                <td class="px-4 py-3">
                  <AppBadge :tone="user.is_active ? 'success' : 'neutral'">
                    {{ user.is_active ? 'Aktif' : 'Nonaktif' }}
                  </AppBadge>
                </td>
                <td class="px-4 py-3">
                  <div class="flex justify-end gap-2">
                    <AppButton variant="secondary" size="sm" @click="openEdit(user)">
                      Ubah
                    </AppButton>
                    <AppButton
                      :variant="user.is_active ? 'danger' : 'ghost'"
                      size="sm"
                      :disabled="user.is_active && isSelf(user)"
                      :title="
                        user.is_active && isSelf(user)
                          ? 'Tidak dapat menonaktifkan akun sendiri'
                          : undefined
                      "
                      @click="toggleTarget = user"
                    >
                      {{ user.is_active ? 'Nonaktifkan' : 'Aktifkan' }}
                    </AppButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <PaginationBar :meta="usersStore.meta" @change="page = $event" />
      </template>
    </div>

    <UserForm
      :open="formOpen"
      :user="editing"
      :loading="usersStore.isSaving"
      :field-errors="fieldErrors"
      :form-error="formError"
      @close="formOpen = false"
      @submit="submitForm"
    />

    <ConfirmDialog
      :open="Boolean(toggleTarget)"
      :title="toggleTarget?.is_active ? 'Nonaktifkan pengguna' : 'Aktifkan pengguna'"
      :message="toggleMessage"
      :confirm-label="toggleTarget?.is_active ? 'Nonaktifkan' : 'Aktifkan'"
      :variant="toggleTarget?.is_active ? 'danger' : 'primary'"
      :loading="usersStore.isSaving"
      @confirm="confirmToggle"
      @cancel="toggleTarget = null"
    />
  </section>
</template>