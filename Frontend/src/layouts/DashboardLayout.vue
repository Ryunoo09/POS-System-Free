<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { PERMISSIONS } from '@/utils/permissions'

interface MenuItem {
  label: string
  to: string
  permissions: string[]
  icon: string
}

const menu: MenuItem[] = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    permissions: [PERMISSIONS.DASHBOARD_READ],
    icon: 'M3 10.5 12 3l9 7.5M5.25 9.75V21h13.5V9.75',
  },
  {
    label: 'Produk',
    to: '/products',
    permissions: [PERMISSIONS.PRODUCT_READ],
    icon: 'M20 7 12 3 4 7v10l8 4 8-4V7ZM4 7l8 4 8-4M12 11v10',
  },
  {
    label: 'Kategori',
    to: '/categories',
    permissions: [PERMISSIONS.CATEGORY_READ],
    icon: 'M4 5h6v6H4zM14 5h6v6h-6zM4 13h6v6H4zM14 13h6v6h-6z',
  },
  {
    label: 'Inventori',
    to: '/inventory',
    permissions: [PERMISSIONS.INVENTORY_READ],
    icon: 'M3 7h18v13H3zM3 11h18M8 7V4h8v3',
  },
  {
    label: 'Transaksi',
    to: '/transactions',
    permissions: [PERMISSIONS.TRANSACTION_READ_ALL, PERMISSIONS.TRANSACTION_READ_OWN],
    icon: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM9 8h6M9 12h6',
  },
  {
    label: 'Retur',
    to: '/returns',
    permissions: [PERMISSIONS.RETURN_READ],
    icon: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10H9',
  },
  {
    label: 'Supplier',
    to: '/suppliers',
    permissions: [PERMISSIONS.SUPPLIER_READ],
    icon: 'M3 21V8l9-5 9 5v13M3 21h18M9 21v-6h6v6',
  },
  {
    label: 'Pembelian',
    to: '/purchases',
    permissions: [PERMISSIONS.PURCHASE_READ],
    icon: 'M4 5h2l2 11h10l2-8H6M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM17 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  },
  {
    label: 'Laporan',
    to: '/reports',
    permissions: [PERMISSIONS.REPORT_READ],
    icon: 'M4 20V6M4 20h16M8 16V10M12 16V6M16 16v-3',
  },
  {
    label: 'Log Aktivitas',
    to: '/audit-logs',
    permissions: [PERMISSIONS.AUDIT_READ],
    icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  },
  {
    label: 'Pengguna',
    to: '/users',
    permissions: [PERMISSIONS.USER_MANAGE],
    icon: 'M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM17 11a3 3 0 1 0 0-6M21 20v-2a4 4 0 0 0-3-3.87',
  },
]

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()

const visibleMenu = computed(() => menu.filter((item) => auth.hasAnyPermission(item.permissions)))

const logout = async () => {
  auth.logout()
  ui.closeSidebar()
  await router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-ground lg:flex">
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
    >
      Lewati ke konten utama
    </a>

    <div
      v-if="ui.sidebarOpen"
      class="fixed inset-0 z-30 bg-ink/40 lg:hidden"
      aria-hidden="true"
      @click="ui.closeSidebar"
    />

    <aside
      :class="[
        'fixed inset-y-0 left-0 z-30 w-60 transform border-r border-border bg-surface transition-transform lg:static lg:translate-x-0',
        ui.sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      ]"
    >
      <div class="flex h-16 items-center gap-3 border-b border-border px-5">
        <div
          class="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-base font-bold text-white"
          aria-hidden="true"
        >
          P
        </div>
        <div>
          <p class="text-sm font-semibold text-ink">POS System</p>
          <p class="text-xs text-ink-3">Point of Sale</p>
        </div>
      </div>

      <nav class="space-y-1 p-3" aria-label="Menu utama">
        <RouterLink
          v-for="item in visibleMenu"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-2 transition-colors duration-150 ease-out hover:bg-surface-2 hover:text-ink"
          active-class="bg-surface-2 font-semibold text-ink"
          @click="ui.closeSidebar"
        >
          <svg
            class="h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path :d="item.icon" />
          </svg>
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="absolute bottom-0 left-0 right-0 border-t border-border p-4">
        <p class="truncate text-xs font-medium text-ink">{{ auth.user?.name }}</p>
        <p class="truncate text-xs text-ink-3">{{ auth.user?.role }}</p>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-surface px-4 lg:px-6"
      >
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="cursor-pointer rounded-md p-2 text-ink-2 hover:bg-surface-2 hover:text-ink lg:hidden"
            aria-label="Buka menu"
            @click="ui.toggleSidebar"
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <div class="flex items-center gap-2 sm:gap-3">
          <span class="hidden text-sm text-ink-2 sm:block">{{ auth.user?.name }}</span>
          <AppButton variant="ghost" size="sm" @click="logout">Keluar</AppButton>
        </div>
      </header>

      <main id="main-content" class="mx-auto w-full max-w-[1440px] flex-1 p-4 lg:p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>