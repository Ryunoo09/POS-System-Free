<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-ground px-4 py-10">
    <section class="w-full max-w-md rounded-xl border border-border bg-surface p-6 sm:p-8">
      <div class="mb-6 flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-lg font-bold text-white"
          aria-hidden="true"
        >
          P
        </div>
        <div>
          <p class="text-sm font-semibold text-ink">POS System</p>
          <p class="text-xs text-ink-3">Point of Sale</p>
        </div>
      </div>

      <RouterView />
    </section>
  </main>
</template>