<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import { useAuthStore } from '@/stores/auth.store'
import { ApiError } from '@/utils/api-error'
import { safeRedirectPath } from '@/utils/navigation'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const formError = ref('')

const passwordType = computed(() => (showPassword.value ? 'text' : 'password'))
const sessionError = computed(() => route.query.sessionError === '1')

const submit = async () => {
  formError.value = ''

  if (!email.value.trim() || !password.value) {
    formError.value = 'Email dan password wajib diisi.'
    return
  }

  try {
    const user = await auth.login({
      email: email.value.trim().toLowerCase(),
      password: password.value,
    })

    const redirect = safeRedirectPath(route.query.redirect)

    if (redirect) {
      await router.push(redirect)
      return
    }

    await router.push(user.role === 'CASHIER' ? '/pos' : '/dashboard')
  } catch (error) {
    formError.value =
      error instanceof ApiError ? error.message : 'Tidak dapat terhubung ke server.'
  }
}
</script>

<template>
  <div>
    <h1 class="text-[28px] font-semibold tracking-tight text-ink">Masuk ke POS System</h1>
    <p class="mt-1 text-sm text-ink-3">
      Silakan masuk dengan akun yang diberikan admin.
    </p>

    <div
      v-if="sessionError"
      class="mt-5 rounded-lg border border-warning bg-warning-soft px-3 py-2 text-sm text-warning"
      role="status"
    >
      Sesi tidak dapat diverifikasi. Periksa koneksi lalu coba masuk kembali.
    </div>

    <div
      v-if="formError"
      class="mt-5 rounded-lg border border-negative bg-negative-soft px-3 py-2 text-sm text-negative"
      role="alert"
    >
      {{ formError }}
    </div>

    <form class="mt-6 space-y-4" @submit.prevent="submit">
      <AppInput
        v-model="email"
        label="Email"
        type="email"
        placeholder="nama@toko.com"
        autocomplete="email"
        inputmode="email"
        required
      />

      <AppInput
        v-model="password"
        label="Password"
        :type="passwordType"
        placeholder="Masukkan password"
        autocomplete="current-password"
        required
      >
        <template #suffix>
          <button
            type="button"
            class="rounded px-2 py-1 text-xs font-medium text-ink-3 hover:bg-surface-2 hover:text-ink-2"
            :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? 'Sembunyi' : 'Lihat' }}
          </button>
        </template>
      </AppInput>

      <AppButton type="submit" block :loading="auth.isLoading">Masuk</AppButton>
    </form>
  </div>
</template>
