import type { RouteRecordRaw } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import PosLayout from '@/layouts/PosLayout.vue'
import { PERMISSIONS } from '@/utils/permissions'

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: AuthLayout,
    meta: { public: true, title: 'Masuk' },
    children: [
      {
        path: '',
        name: 'login',
        component: () => import('@/pages/LoginPage.vue'),
        meta: { public: true, title: 'Masuk' },
      },
    ],
  },
  {
    path: '/',
    component: DashboardLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/pages/HomeRedirectPage.vue'),
        meta: { title: 'Beranda' },
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/pages/DashboardPage.vue'),
        meta: { permissions: [PERMISSIONS.DASHBOARD_READ], title: 'Dashboard' },
      },
      {
        path: 'products',
        name: 'products',
        component: () => import('@/pages/ProductsPage.vue'),
        meta: { permissions: [PERMISSIONS.PRODUCT_READ], title: 'Produk' },
      },
      {
        path: 'categories',
        name: 'categories',
        component: () => import('@/pages/CategoriesPage.vue'),
        meta: { permissions: [PERMISSIONS.CATEGORY_READ], title: 'Kategori' },
      },
      {
        path: 'inventory',
        name: 'inventory',
        component: () => import('@/pages/InventoryPage.vue'),
        meta: { permissions: [PERMISSIONS.INVENTORY_READ], title: 'Inventori' },
      },
      {
        path: 'transactions',
        name: 'transactions',
        component: () => import('@/pages/TransactionsPage.vue'),
        meta: {
          permissions: [PERMISSIONS.TRANSACTION_READ_ALL, PERMISSIONS.TRANSACTION_READ_OWN],
          title: 'Riwayat Transaksi',
        },
      },
      {
        path: 'transactions/:id',
        name: 'transaction-detail',
        component: () => import('@/pages/TransactionDetailPage.vue'),
        meta: {
          permissions: [PERMISSIONS.TRANSACTION_READ_ALL, PERMISSIONS.TRANSACTION_READ_OWN],
          title: 'Detail Transaksi',
        },
      },
      {
        path: 'returns',
        name: 'returns',
        component: () => import('@/pages/ReturnsPage.vue'),
        meta: { permissions: [PERMISSIONS.RETURN_READ], title: 'Riwayat Retur' },
      },
      {
        path: 'suppliers',
        name: 'suppliers',
        component: () => import('@/pages/SuppliersPage.vue'),
        meta: { permissions: [PERMISSIONS.SUPPLIER_READ], title: 'Supplier' },
      },
      {
        path: 'purchases',
        name: 'purchases',
        component: () => import('@/pages/PurchasesPage.vue'),
        meta: { permissions: [PERMISSIONS.PURCHASE_READ], title: 'Pembelian' },
      },
      {
        path: 'reports',
        name: 'reports',
        component: () => import('@/pages/ReportsPage.vue'),
        meta: { permissions: [PERMISSIONS.REPORT_READ], title: 'Laporan' },
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('@/pages/UsersPage.vue'),
        meta: { permissions: [PERMISSIONS.USER_MANAGE], title: 'Pengguna' },
      },
      {
        path: 'audit-logs',
        name: 'audit-logs',
        component: () => import('@/pages/AuditLogsPage.vue'),
        meta: { permissions: [PERMISSIONS.AUDIT_READ], title: 'Log Aktivitas' },
      },
    ],
  },
  {
    path: '/pos',
    component: PosLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'pos',
        component: () => import('@/pages/PosPage.vue'),
        meta: { permissions: [PERMISSIONS.TRANSACTION_CREATE], title: 'POS' },
      },
    ],
  },
  {
    path: '/403',
    name: 'forbidden',
    component: () => import('@/pages/ForbiddenPage.vue'),
    meta: { public: true, title: 'Akses Ditolak' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/NotFoundPage.vue'),
    meta: { public: true, title: 'Halaman Tidak Ditemukan' },
  },
]
