import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Toast, ToastType } from '@/types/ui'

export const useUiStore = defineStore('ui', () => {
  const sidebarOpen = ref(false)
  const toasts = ref<Toast[]>([])
  let nextId = 1

  const dismissToast = (id: number) => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  const showToast = (message: string, type: ToastType = 'info', duration = 3_000): number => {
    const id = nextId++
    toasts.value.push({ id, type, message })

    if (duration > 0) {
      setTimeout(() => dismissToast(id), duration)
    }

    return id
  }

  const toggleSidebar = () => {
    sidebarOpen.value = !sidebarOpen.value
  }

  const closeSidebar = () => {
    sidebarOpen.value = false
  }

  return {
    sidebarOpen,
    toasts,
    showToast,
    dismissToast,
    toggleSidebar,
    closeSidebar,
  }
})
