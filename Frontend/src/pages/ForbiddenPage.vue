<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-ground px-4">
    <section class="w-full max-w-md text-center">
      <p class="text-sm font-semibold text-accent">403</p>
      <h1 class="mt-2 text-[28px] font-semibold tracking-tight text-ink">Akses ditolak</h1>
      <p class="mt-2 text-sm text-ink-3">
        Akun Anda tidak memiliki izin untuk membuka halaman ini.
      </p>
      <div class="mt-6 flex justify-center gap-2">
        <RouterLink
          to="/"
          class="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Ke beranda
        </RouterLink>
        <RouterLink
          to="/login"
          class="inline-flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-ink-2 hover:bg-surface-2"
        >
          Masuk
        </RouterLink>
      </div>
    </section>
  </main>
</template>
