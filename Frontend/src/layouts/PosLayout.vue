<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useCartStore } from '@/stores/cart.store'
import { PERMISSIONS } from '@/utils/permissions'

const auth = useAuthStore()
const cart = useCartStore()
const router = useRouter()

const logout = async () => {
  cart.clear()
  auth.logout()
  await router.push('/login')
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-ground">
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
    >
      Lewati ke konten utama
    </a>

    <header class="flex h-14 items-center justify-between border-b border-border bg-surface px-4">
      <div class="flex items-center gap-3">
        <div
          class="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white"
          aria-hidden="true"
        >
          P
        </div>
        <p class="text-sm font-semibold text-ink">POS System</p>
        <span class="hidden text-xs text-ink-3 sm:inline">Kasir</span>
      </div>

      <div class="flex items-center gap-2 sm:gap-3">
        <RouterLink
          v-if="auth.hasPermission(PERMISSIONS.TRANSACTION_READ_OWN)"
          to="/transactions"
          class="rounded-md px-2 py-1 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          Riwayat
        </RouterLink>
        <span class="hidden text-sm text-ink-2 sm:block">{{ auth.user?.name }}</span>
        <AppButton variant="ghost" size="sm" @click="logout">Keluar</AppButton>
      </div>
    </header>

    <main id="main-content" class="flex-1 p-4">
      <RouterView />
    </main>
  </div>
</template>