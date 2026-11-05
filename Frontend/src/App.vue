<script setup lang="ts">
import { RouterView } from 'vue-router'
import ToastContainer from '@/components/common/ToastContainer.vue'
import { useUiStore } from '@/stores/ui.store'

const ui = useUiStore()
</script>

<template>
  <RouterView />
  <ToastContainer :toasts="ui.toasts" @dismiss="ui.dismissToast" />
</template>
