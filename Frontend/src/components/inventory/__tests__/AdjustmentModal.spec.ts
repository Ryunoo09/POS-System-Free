import { mount, type VueWrapper } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AdjustmentModal from '@/components/inventory/AdjustmentModal.vue'
import type { Product } from '@/types/product'

const product: Product = {
  id: 'product-1',
  sku: 'MKN-001',
  barcode: null,
  name: 'Kopi Susu',
  description: null,
  category: { id: 'cat-1', name: 'Minuman' },
  unit: 'gelas',
  cost_price: '3000.00',
  selling_price: '5000.00',
  stock: 10,
  min_stock: 5,
  is_low_stock: false,
  is_active: true,
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-01T00:00:00.000Z',
}

const mountModal = (movementType: 'PURCHASE' | 'ADJUSTMENT' = 'ADJUSTMENT') =>
  mount(AdjustmentModal, {
    props: { open: true, product, movementType },
    global: { stubs: { teleport: true } },
  })

const inputByLabel = (wrapper: VueWrapper, label: string) => {
  const labelElement = wrapper.findAll('label').find((item) => item.text().includes(label))
  const inputId = labelElement?.attributes('for')

  if (!inputId) throw new Error(`Input dengan label "${label}" tidak ditemukan`)

  return wrapper.get(`#${inputId}`)
}

const submitButton = (wrapper: VueWrapper) =>
  wrapper.findAll('button').find((button) => button.text().includes('Simpan Penyesuaian'))

describe('AdjustmentModal', () => {
  it('menonaktifkan submit ketika stok akhir negatif', async () => {
    const wrapper = mountModal()

    await inputByLabel(wrapper, 'Jumlah Penyesuaian').setValue('-11')
    await inputByLabel(wrapper, 'Alasan').setValue('Koreksi stok')

    expect(wrapper.text()).toContain('Stok akhir tidak boleh negatif.')
    expect(submitButton(wrapper)?.attributes('disabled')).toBeDefined()
  })

  it('mewajibkan alasan untuk penyesuaian lalu mengirim nilai bertanda', async () => {
    const wrapper = mountModal()

    await inputByLabel(wrapper, 'Jumlah Penyesuaian').setValue('-3')
    expect(submitButton(wrapper)?.attributes('disabled')).toBeDefined()

    await inputByLabel(wrapper, 'Alasan').setValue('Barang rusak')
    expect(submitButton(wrapper)?.attributes('disabled')).toBeUndefined()

    await submitButton(wrapper)?.trigger('click')

    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual({
      quantity: -3,
      notes: 'Barang rusak',
    })
  })

  it('menolak jumlah pembelian nol atau negatif', async () => {
    const wrapper = mountModal('PURCHASE')

    await inputByLabel(wrapper, 'Jumlah Masuk').setValue('-1')

    expect(wrapper.text()).toContain('Jumlah harus lebih dari 0')
    expect(wrapper.findAll('button').find((button) => button.text() === 'Tambah Stok')?.attributes('disabled')).toBeDefined()
  })

  it('menampilkan preview stok akhir untuk penambahan stok', async () => {
    const wrapper = mountModal('PURCHASE')

    await inputByLabel(wrapper, 'Jumlah Masuk').setValue('5')

    expect(wrapper.text()).toContain('Stok akhir')
    expect(wrapper.text()).toContain('15')

    const button = wrapper.findAll('button').find((item) => item.text() === 'Tambah Stok')
    expect(button?.attributes('disabled')).toBeUndefined()

    await button?.trigger('click')

    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual({ quantity: 5, notes: '' })
  })
})