import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SalesChart from '../SalesChart.vue'

const data = [
  { date: '2026-11-01', revenue: '90000.00', transaction_count: 1 },
  { date: '2026-11-02', revenue: '50000.00', transaction_count: 1 },
  { date: '2026-11-03', revenue: '0.00', transaction_count: 0 },
]

describe('SalesChart', () => {
  it('menggambar satu batang per hari dan tabel aksesibel', () => {
    const wrapper = mount(SalesChart, { props: { data } })

    expect(wrapper.findAll('rect')).toHaveLength(3)
    expect(wrapper.findAll('tbody tr')).toHaveLength(3)
    expect(wrapper.text()).toContain('Data penjualan harian')
  })

  it('tetap merender grafik saat semua nilai nol', () => {
    const wrapper = mount(SalesChart, {
      props: {
        data: [{ date: '2026-11-03', revenue: '0.00', transaction_count: 0 }],
      },
    })

    expect(wrapper.findAll('rect')).toHaveLength(1)
    expect(wrapper.find('rect').attributes('height')).toBe('0')
  })

  it('menandai batang tertinggi dengan warna aksen penuh', () => {
    const wrapper = mount(SalesChart, { props: { data } })

    const rects = wrapper.findAll('rect')
    expect(rects[0]?.classes()).toContain('fill-accent')
    expect(rects[1]?.classes()).toContain('fill-accent-mark')
  })
})