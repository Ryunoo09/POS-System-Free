<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-slate-50 px-4">
    <section class="w-full max-w-md text-center">
      <p class="text-sm font-semibold text-brand-600">403</p>
      <h1 class="mt-2 text-2xl font-semibold text-slate-900">Akses ditolak</h1>
      <p class="mt-2 text-sm text-slate-500">
        Akun Anda tidak memiliki izin untuk membuka halaman ini.
      </p>
      <div class="mt-6 flex justify-center gap-2">
        <RouterLink
          to="/"
          class="inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
        >
          Ke beranda
        </RouterLink>
        <RouterLink
          to="/login"
          class="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Masuk
        </RouterLink>
      </div>
    </section>
  </main>
</template>
