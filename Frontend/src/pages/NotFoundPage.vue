<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-ground px-4">
    <section class="w-full max-w-md text-center">
      <p class="text-sm font-semibold text-accent">404</p>
      <h1 class="mt-2 text-[28px] font-semibold tracking-tight text-ink">Halaman tidak ditemukan</h1>
      <p class="mt-2 text-sm text-ink-3">
        Alamat yang Anda buka tidak tersedia atau sudah dipindahkan.
      </p>
      <RouterLink
        to="/"
        class="mt-6 inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover"
      >
        Ke beranda
      </RouterLink>
    </section>
  </main>
</template>
