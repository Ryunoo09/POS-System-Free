import { onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { usePrintingStore } from '@/stores/printing.store'

// Beri waktu transisi modal (160ms) selesai sebelum dialog print dibuka.
const AUTO_PRINT_DELAY_MS = 250

export const useAutoPrint = (
  isOpen: MaybeRefOrGetter<boolean>,
  transactionId: MaybeRefOrGetter<string | null>,
) => {
  const printing = usePrintingStore()
  const printedId = ref<string | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined

  watch(
    () => toValue(isOpen),
    (open) => {
      if (!open || !printing.autoPrint) return

      const id = toValue(transactionId)
      if (!id || printedId.value === id) return

      printedId.value = id
      timer = setTimeout(() => printing.print(), AUTO_PRINT_DELAY_MS)
    },
  )

  onScopeDispose(() => clearTimeout(timer), true)

  return { autoPrint: printing.autoPrint, setAutoPrint: printing.setAutoPrint }
}