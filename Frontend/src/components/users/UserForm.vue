<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import type { Role } from '@/types/auth'
import type { User, UserFormValues } from '@/types/user'

const props = withDefaults(
  defineProps<{
    open: boolean
    user?: User | null
    loading?: boolean
    fieldErrors?: Record<string, string>
    formError?: string
  }>(),
  {
    user: null,
    loading: false,
    fieldErrors: () => ({}),
    formError: '',
  },
)

const emit = defineEmits<{ close: []; submit: [values: UserFormValues] }>()

const roleOptions: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'OWNER', label: 'Owner' },
  { value: 'CASHIER', label: 'Kasir' },
]

const isUpdate = computed(() => Boolean(props.user))
const title = computed(() => (isUpdate.value ? 'Ubah Pengguna' : 'Tambah Pengguna'))

const form = reactive<UserFormValues>({
  name: '',
  email: '',
  password: '',
  role: 'CASHIER',
})

const showPassword = ref(false)
const localErrors = ref<Record<string, string>>({})

const resetForm = () => {
  form.name = props.user?.name ?? ''
  form.email = props.user?.email ?? ''
  form.password = ''
  form.role = props.user?.role ?? 'CASHIER'
  showPassword.value = false
  localErrors.value = {}
}

watch(
  () => props.open,
  (open) => {
    if (open) resetForm()
  },
  { immediate: true },
)

const passwordRules = computed(() => [
  { label: 'Minimal 8 karakter', valid: form.password.length >= 8 },
  { label: 'Mengandung huruf kecil', valid: /[a-z]/.test(form.password) },
  { label: 'Mengandung huruf besar', valid: /[A-Z]/.test(form.password) },
  { label: 'Mengandung angka', valid: /\d/.test(form.password) },
])

const passwordComplete = computed(() => passwordRules.value.every((rule) => rule.valid))
const showPasswordRules = computed(() => !isUpdate.value || form.password.length > 0)
const passwordType = computed(() => (showPassword.value ? 'text' : 'password'))

const fieldError = (field: string): string => localErrors.value[field] ?? props.fieldErrors[field] ?? ''

const validatePassword = (errors: Record<string, string>) => {
  if (!form.password) {
    if (!isUpdate.value) errors.password = 'Password wajib diisi'
    return
  }

  if (!passwordComplete.value) {
    errors.password = 'Password belum memenuhi seluruh aturan'
  } else if (form.password === form.email.trim().toLowerCase()) {
    errors.password = 'Password tidak boleh sama dengan email'
  }
}

const submit = () => {
  const errors: Record<string, string> = {}
  const name = form.name.trim()
  const email = form.email.trim().toLowerCase()

  if (!name) {
    errors.name = 'Nama wajib diisi'
  } else if (name.length > 100) {
    errors.name = 'Nama maksimal 100 karakter'
  }

  if (!isUpdate.value) {
    if (!email) {
      errors.email = 'Email wajib diisi'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
      errors.email = 'Format email tidak valid'
    }
  }

  validatePassword(errors)
  localErrors.value = errors

  if (Object.keys(errors).length > 0) return

  emit('submit', {
    name,
    email,
    password: form.password,
    role: form.role as Role,
  })
}
</script>

<template>
  <AppModal :open="open" :title="title" @close="emit('close')">
    <form id="user-form" class="space-y-4" novalidate @submit.prevent="submit">
      <div
        v-if="formError"
        class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
        role="alert"
      >
        {{ formError }}
      </div>

      <AppInput
        v-model="form.name"
        label="Nama lengkap"
        placeholder="Nama pengguna"
        :error="fieldError('name')"
        required
      />

      <AppInput
        v-model="form.email"
        label="Email"
        type="email"
        placeholder="nama@toko.com"
        inputmode="email"
        autocomplete="email"
        :disabled="isUpdate"
        :hint="isUpdate ? 'Email tidak dapat diubah.' : ''"
        :error="fieldError('email')"
        :required="!isUpdate"
      />

      <div>
        <AppInput
          v-model="form.password"
          label="Password"
          :type="passwordType"
          :placeholder="isUpdate ? 'Kosongkan jika tidak diubah' : 'Masukkan password'"
          autocomplete="new-password"
          :hint="isUpdate ? 'Isi hanya jika ingin mengganti password.' : ''"
          :error="fieldError('password')"
          :required="!isUpdate"
        >
          <template #suffix>
            <button
              type="button"
              class="rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? 'Sembunyi' : 'Lihat' }}
            </button>
          </template>
        </AppInput>

        <ul v-if="showPasswordRules" class="mt-2 grid gap-1 text-xs sm:grid-cols-2">
          <li
            v-for="rule in passwordRules"
            :key="rule.label"
            :class="rule.valid ? 'text-emerald-600' : 'text-slate-500'"
          >
            <span aria-hidden="true">{{ rule.valid ? '✓' : '•' }}</span>
            {{ rule.label }}
            <span class="sr-only">{{ rule.valid ? 'terpenuhi' : 'belum terpenuhi' }}</span>
          </li>
        </ul>
      </div>

      <AppSelect
        v-model="form.role"
        label="Role"
        :options="roleOptions"
        :error="fieldError('role')"
        required
      />
    </form>

    <template #footer>
      <AppButton variant="secondary" :disabled="loading" @click="emit('close')">Batal</AppButton>
      <AppButton type="submit" form="user-form" :loading="loading">Simpan</AppButton>
    </template>
  </AppModal>
</template>