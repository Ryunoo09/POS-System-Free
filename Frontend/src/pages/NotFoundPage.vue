<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-slate-50 px-4">
    <section class="w-full max-w-md text-center">
      <p class="text-sm font-semibold text-brand-600">404</p>
      <h1 class="mt-2 text-2xl font-semibold text-slate-900">Halaman tidak ditemukan</h1>
      <p class="mt-2 text-sm text-slate-500">
        Alamat yang Anda buka tidak tersedia atau sudah dipindahkan.
      </p>
      <RouterLink
        to="/"
        class="mt-6 inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
      >
        Ke beranda
      </RouterLink>
    </section>
  </main>
</template>
