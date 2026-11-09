import { ref } from 'vue'
import { defineStore } from 'pinia'
import { PRINT_PREFS_STORAGE_KEY } from '@/utils/constants'

type PrintPrefs = { autoPrint: boolean }

const DEFAULT_PREFS: PrintPrefs = { autoPrint: true }

const loadPrefs = (): PrintPrefs => {
  try {
    const raw = localStorage.getItem(PRINT_PREFS_STORAGE_KEY)
    if (!raw) return DEFAULT_PREFS

    const parsed = JSON.parse(raw) as Partial<PrintPrefs>
    return { autoPrint: parsed.autoPrint ?? DEFAULT_PREFS.autoPrint }
  } catch {
    return DEFAULT_PREFS
  }
}

export const usePrintingStore = defineStore('printing', () => {
  const autoPrint = ref(loadPrefs().autoPrint)

  const setAutoPrint = (value: boolean) => {
    autoPrint.value = value
    localStorage.setItem(PRINT_PREFS_STORAGE_KEY, JSON.stringify({ autoPrint: value }))
  }

  const print = (): void => {
    if (typeof window === 'undefined') return
    window.print()
  }

  return {
    autoPrint,
    setAutoPrint,
    print,
  }
})