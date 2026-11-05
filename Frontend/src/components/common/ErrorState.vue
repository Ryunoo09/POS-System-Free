<script setup lang="ts">
import AppButton from './AppButton.vue'

withDefaults(
  defineProps<{
    message?: string
  }>(),
  {
    message: 'Terjadi kesalahan saat memuat data.',
  },
)

const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="flex flex-col items-center justify-center px-6 py-10 text-center">
    <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-rose-50">
      <span class="text-lg font-semibold text-rose-600" aria-hidden="true">!</span>
    </div>
    <h3 class="text-sm font-semibold text-slate-900">Gagal memuat data</h3>
    <p class="mt-1 max-w-sm text-sm text-slate-500">{{ message }}</p>
    <AppButton class="mt-4" variant="secondary" size="sm" @click="emit('retry')">
      Coba lagi
    </AppButton>
  </div>
</template>
