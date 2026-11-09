import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { PRINT_PREFS_STORAGE_KEY } from '@/utils/constants'
import { usePrintingStore } from '../printing.store'

describe('printing.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('default auto-print aktif', () => {
    expect(usePrintingStore().autoPrint).toBe(true)
  })

  it('membaca preferensi tersimpan', () => {
    localStorage.setItem(PRINT_PREFS_STORAGE_KEY, JSON.stringify({ autoPrint: false }))

    expect(usePrintingStore().autoPrint).toBe(false)
  })

  it('menyimpan preferensi saat diubah', () => {
    usePrintingStore().setAutoPrint(false)

    expect(JSON.parse(localStorage.getItem(PRINT_PREFS_STORAGE_KEY) ?? '{}')).toEqual({
      autoPrint: false,
    })
  })

  it('fallback ke default bila data rusak', () => {
    localStorage.setItem(PRINT_PREFS_STORAGE_KEY, '{bukan-json')

    expect(usePrintingStore().autoPrint).toBe(true)
  })

  it('print memanggil window.print', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})

    usePrintingStore().print()

    expect(print).toHaveBeenCalledTimes(1)
    print.mockRestore()
  })
})
