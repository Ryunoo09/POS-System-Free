<script setup lang="ts">
import type { Toast, ToastType } from '@/types/ui'

defineProps<{ toasts: Toast[] }>()

const emit = defineEmits<{ dismiss: [id: number] }>()

const toastClass = (type: ToastType) =>
  ({
    success: 'border-accent/30 bg-accent-soft text-accent-ink',
    error: 'border-negative bg-negative-soft text-negative',
    info: 'border-border bg-surface text-ink',
  })[type]
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end"
  >
    <TransitionGroup name="toast" tag="div" class="flex w-full max-w-sm flex-col gap-2">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        role="status"
        :class="[
          'pointer-events-auto flex items-start gap-3 rounded-lg border p-3 shadow-lg',
          toastClass(toast.type),
        ]"
      >
        <p class="flex-1 text-sm font-medium">{{ toast.message }}</p>
        <button
          type="button"
          class="rounded p-0.5 text-lg leading-none opacity-70 hover:opacity-100"
          aria-label="Tutup notifikasi"
          @click="emit('dismiss', toast.id)"
        >
          ×
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 160ms ease-out,
    transform 160ms ease-out;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>