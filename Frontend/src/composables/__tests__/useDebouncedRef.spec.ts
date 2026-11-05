import { nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedRef } from '../useDebouncedRef'

describe('useDebouncedRef', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('menunda pembaruan nilai sampai delay terlewati', async () => {
    const source = ref('awal')
    const debounced = useDebouncedRef(source, 300)

    source.value = 'baru'
    await nextTick()

    vi.advanceTimersByTime(299)
    expect(debounced.value).toBe('awal')

    vi.advanceTimersByTime(1)
    expect(debounced.value).toBe('baru')
  })

  it('membatalkan pembaruan sebelumnya saat nilai berubah lagi', async () => {
    const source = ref('')
    const debounced = useDebouncedRef(source, 300)

    source.value = 'per'
    await nextTick()
    vi.advanceTimersByTime(200)

    source.value = 'produk'
    await nextTick()
    vi.advanceTimersByTime(299)
    expect(debounced.value).toBe('')

    vi.advanceTimersByTime(1)
    expect(debounced.value).toBe('produk')
  })
})