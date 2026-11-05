<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    description: string
    phase?: string
  }>(),
  {
    phase: 'Fondasi',
  },
)
</script>

<template>
  <section class="space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">{{ title }}</h1>
        <p class="mt-1 text-sm text-slate-500">{{ description }}</p>
      </div>
      <span
        class="rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700"
        :title="`Akan diimplementasikan pada phase ${phase}`"
      >
        Placeholder · {{ phase }}
      </span>
    </header>

    <div class="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p class="text-sm font-medium text-slate-700">Halaman ini belum diimplementasikan.</p>
      <p class="mt-1 text-sm text-slate-500">
        Navigasi, layout, dan komponen dasar sudah siap. Isi halaman ditambahkan pada fase
        berikutnya.
      </p>
    </div>
  </section>
</template>
