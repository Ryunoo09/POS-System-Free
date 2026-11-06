<script setup lang="ts">
import AppButton from './AppButton.vue'
import AppModal from './AppModal.vue'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'primary' | 'danger'
    loading?: boolean
  }>(),
  {
    confirmLabel: 'Ya',
    cancelLabel: 'Batal',
    variant: 'primary',
    loading: false,
  },
)

const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <AppModal :open="open" :title="title" max-width="sm" @close="emit('cancel')">
    <p class="text-sm text-ink-2">{{ message }}</p>

    <template #footer>
      <AppButton variant="secondary" :disabled="loading" @click="emit('cancel')">
        {{ cancelLabel }}
      </AppButton>
      <AppButton :variant="variant" :loading="loading" @click="emit('confirm')">
        {{ confirmLabel }}
      </AppButton>
    </template>
  </AppModal>
</template>