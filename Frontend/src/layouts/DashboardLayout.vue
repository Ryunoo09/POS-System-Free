<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { PERMISSIONS } from '@/utils/permissions'

interface MenuItem {
  label: string
  to: string
  permissions: string[]
}

const menu: MenuItem[] = [
  { label: 'Dashboard', to: '/dashboard', permissions: [PERMISSIONS.DASHBOARD_READ] },
  { label: 'Produk', to: '/products', permissions: [PERMISSIONS.PRODUCT_READ] },
  { label: 'Kategori', to: '/categories', permissions: [PERMISSIONS.CATEGORY_READ] },
  { label: 'Inventori', to: '/inventory', permissions: [PERMISSIONS.INVENTORY_READ] },
  {
    label: 'Transaksi',
    to: '/transactions',
    permissions: [PERMISSIONS.TRANSACTION_READ_ALL, PERMISSIONS.TRANSACTION_READ_OWN],
  },
  { label: 'Laporan', to: '/reports', permissions: [PERMISSIONS.REPORT_READ] },
  { label: 'Pengguna', to: '/users', permissions: [PERMISSIONS.USER_MANAGE] },
]

const auth = useAuthStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()

const visibleMenu = computed(() => menu.filter((item) => auth.hasAnyPermission(item.permissions)))

const pageTitle = computed(() =>
  typeof route.meta.title === 'string' ? route.meta.title : 'POS System',
)

const logout = async () => {
  auth.logout()
  ui.closeSidebar()
  await router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 lg:flex">
    <div
      v-if="ui.sidebarOpen"
      class="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
      aria-hidden="true"
      @click="ui.closeSidebar"
    />

    <aside
      :class="[
        'fixed inset-y-0 left-0 z-30 w-60 transform border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0',
        ui.sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      ]"
    >
      <div class="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
        <div
          class="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-base font-bold text-white"
          aria-hidden="true"
        >
          P
        </div>
        <div>
          <p class="text-sm font-semibold text-slate-900">POS System</p>
          <p class="text-xs text-slate-500">Point of Sale</p>
        </div>
      </div>

      <nav class="space-y-1 p-3" aria-label="Menu utama">
        <RouterLink
          v-for="item in visibleMenu"
          :key="item.to"
          :to="item.to"
          class="flex items-center rounded-lg border-l-2 border-transparent px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          active-class="border-brand-600 bg-brand-50 text-brand-700"
          @click="ui.closeSidebar"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-4">
        <p class="truncate text-xs font-medium text-slate-900">{{ auth.user?.name }}</p>
        <p class="truncate text-xs text-slate-500">{{ auth.user?.role }}</p>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6"
      >
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Buka menu"
            @click="ui.toggleSidebar"
          >
            ☰
          </button>
          <h1 class="text-base font-semibold text-slate-900">{{ pageTitle }}</h1>
        </div>

        <div class="flex items-center gap-2 sm:gap-3">
          <span class="hidden text-sm text-slate-600 sm:block">{{ auth.user?.name }}</span>
          <AppButton variant="ghost" size="sm" @click="logout">Keluar</AppButton>
        </div>
      </header>

      <main class="mx-auto w-full max-w-[1440px] flex-1 p-4 lg:p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
