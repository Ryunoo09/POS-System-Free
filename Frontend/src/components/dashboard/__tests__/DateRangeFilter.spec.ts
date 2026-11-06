import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DateRangeFilter from '../DateRangeFilter.vue'

describe('DateRangeFilter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-06T01:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('mengubah preset menjadi rentang tanggal dan memancarkan perubahan', async () => {
    const wrapper = mount(DateRangeFilter, {
      props: {
        modelValue: { start_date: '2026-11-06', end_date: '2026-11-06' },
      },
    })

    await wrapper.find('select').setValue('last7')

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted?.[emitted.length - 1]?.[0]).toEqual({
      start_date: '2026-10-31',
      end_date: '2026-11-06',
    })
  })

  it('menampilkan preset yang sesuai dengan rentang awal', () => {
    const wrapper = mount(DateRangeFilter, {
      props: {
        modelValue: { start_date: '2026-10-08', end_date: '2026-11-06' },
      },
    })

    expect((wrapper.find('select').element as HTMLSelectElement).value).toBe('last30')
  })

  it('tidak memancarkan perubahan bila tanggal awal melebihi tanggal akhir', async () => {
    const wrapper = mount(DateRangeFilter, {
      props: {
        modelValue: { start_date: '2026-11-01', end_date: '2026-11-03' },
      },
    })

    const [startInput, endInput] = wrapper.findAll('input[type="date"]')
    await startInput?.setValue('2026-11-10')
    await endInput?.setValue('2026-11-01')

    expect(wrapper.text()).toContain('Tanggal awal tidak boleh melebihi tanggal akhir')
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })
})