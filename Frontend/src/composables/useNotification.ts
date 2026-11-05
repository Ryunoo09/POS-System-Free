import { useUiStore } from '@/stores/ui.store'

export const useNotification = () => {
  const ui = useUiStore()

  return {
    success: (message: string) => ui.showToast(message, 'success'),
    error: (message: string) => ui.showToast(message, 'error'),
    info: (message: string) => ui.showToast(message, 'info'),
  }
}
