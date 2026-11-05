<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import { useAuthStore } from '@/stores/auth.store'
import { PERMISSIONS } from '@/utils/permissions'

const auth = useAuthStore()
const router = useRouter()

const logout = async () => {
  auth.logout()
  await router.push('/login')
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-slate-50">
    <header
      class="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4"
    >
      <div class="flex items-center gap-3">
        <div
          class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white"
          aria-hidden="true"
        >
          P
        </div>
        <p class="text-sm font-semibold text-slate-900">POS System</p>
        <span class="hidden text-xs text-slate-500 sm:inline">Kasir</span>
      </div>

      <div class="flex items-center gap-2 sm:gap-3">
        <RouterLink
          v-if="auth.hasPermission(PERMISSIONS.TRANSACTION_READ_OWN)"
          to="/transactions"
          class="rounded-md px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          Riwayat
        </RouterLink>
        <span class="hidden text-sm text-slate-600 sm:block">{{ auth.user?.name }}</span>
        <AppButton variant="ghost" size="sm" @click="logout">Keluar</AppButton>
      </div>
    </header>

    <main class="flex-1 p-4">
      <RouterView />
    </main>
  </div>
</template>
