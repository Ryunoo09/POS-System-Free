import { nextTick, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAutoPrint } from '../useAutoPrint'
import { usePrintingStore } from '@/stores/printing.store'

describe('useAutoPrint', () => {
  let print: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.useFakeTimers()
    print = vi.spyOn(window, 'print').mockImplementation(() => {})
  })

  afterEach(() => {
    print.mockRestore()
    vi.useRealTimers()
  })

  it('mencetak otomatis saat dialog terbuka', async () => {
    const open = ref(false)
    const id = ref<string | null>(null)
    useAutoPrint(open, id)

    id.value = 'tx-1'
    open.value = true
    await nextTick()
    await vi.runAllTimersAsync()

    expect(print).toHaveBeenCalledTimes(1)
  })

  it('tidak mencetak bila auto-print nonaktif', async () => {
    usePrintingStore().setAutoPrint(false)

    const open = ref(false)
    const id = ref<string | null>(null)
    useAutoPrint(open, id)

    id.value = 'tx-1'
    open.value = true
    await nextTick()
    await vi.runAllTimersAsync()

    expect(print).not.toHaveBeenCalled()
  })

  it('tidak mencetak dua kali untuk transaksi yang sama', async () => {
    const open = ref(false)
    const id = ref('tx-1')
    useAutoPrint(open, id)

    open.value = true
    await nextTick()
    await vi.runAllTimersAsync()
    open.value = false
    await nextTick()
    open.value = true
    await nextTick()
    await vi.runAllTimersAsync()

    expect(print).toHaveBeenCalledTimes(1)
  })

  it('tidak mencetak bila belum ada transaksi', async () => {
    const open = ref(false)
    const id = ref<string | null>(null)
    useAutoPrint(open, id)

    open.value = true
    await nextTick()
    await vi.runAllTimersAsync()

    expect(print).not.toHaveBeenCalled()
  })
})