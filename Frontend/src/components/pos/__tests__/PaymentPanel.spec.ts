import { mount, type VueWrapper } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PaymentPanel from '@/components/pos/PaymentPanel.vue'

const baseProps = {
  method: 'CASH' as const,
  amountPaid: 10000,
  reference: '',
  totalAmount: 7000,
  changeAmount: 3000,
  isCash: true,
  canCheckout: true,
  isCheckingOut: false,
}

const inputByLabel = (wrapper: VueWrapper, label: string) => {
  const labelElement = wrapper.findAll('label').find((entry) => entry.text().includes(label))
  const inputId = labelElement?.attributes('for')

  if (!inputId) throw new Error(`Input dengan label "${label}" tidak ditemukan`)

  return wrapper.get(`#${inputId}`)
}

describe('PaymentPanel', () => {
  it('memancarkan checkout saat tombol diklik', async () => {
    const wrapper = mount(PaymentPanel, { props: baseProps })

    await wrapper.findAll('button').find((button) => button.text() === 'Checkout')?.trigger('click')

    expect(wrapper.emitted('checkout')).toHaveLength(1)
  })

  it('menonaktifkan checkout bila belum memenuhi syarat', () => {
    const wrapper = mount(PaymentPanel, {
      props: { ...baseProps, canCheckout: false, amountPaid: 0, changeAmount: 0 },
    })

    const button = wrapper.findAll('button').find((entry) => entry.text() === 'Checkout')
    expect(button?.attributes('disabled')).toBeDefined()
  })

  it('menampilkan pesan error pembayaran', () => {
    const wrapper = mount(PaymentPanel, {
      props: { ...baseProps, formError: 'Pembayaran kurang Rp 1.000' },
    })

    expect(wrapper.text()).toContain('Pembayaran kurang Rp 1.000')
  })

  it('memancarkan metode pembayaran baru', async () => {
    const wrapper = mount(PaymentPanel, { props: baseProps })

    await wrapper.get('select').setValue('QRIS')

    expect(wrapper.emitted('update:method')?.[0]).toEqual(['QRIS'])
  })

  it('mengisi jumlah bayar cepat dengan uang pas', async () => {
    const wrapper = mount(PaymentPanel, { props: baseProps })

    await wrapper.findAll('button').find((button) => button.text() === 'Uang pas')?.trigger('click')

    expect(wrapper.emitted('update:amount-paid')?.[0]).toEqual([7000])
  })

  it('menampilkan input referensi dan menyembunyikan tombol cepat untuk non-tunai', () => {
    const wrapper = mount(PaymentPanel, {
      props: {
        ...baseProps,
        method: 'QRIS',
        amountPaid: 7000,
        changeAmount: 0,
        isCash: false,
      },
    })

    expect(inputByLabel(wrapper, 'Jumlah dibayar').attributes('disabled')).toBeDefined()
    expect((inputByLabel(wrapper, 'Jumlah dibayar').element as HTMLInputElement).value).toBe(
      '7000',
    )
    expect(inputByLabel(wrapper, 'Referensi pembayaran')).toBeTruthy()
    expect(wrapper.findAll('button').some((button) => button.text() === 'Uang pas')).toBe(false)
  })

  it('memancarkan referensi pembayaran', async () => {
    const wrapper = mount(PaymentPanel, {
      props: {
        ...baseProps,
        method: 'BANK_TRANSFER',
        amountPaid: 7000,
        changeAmount: 0,
        isCash: false,
      },
    })

    await inputByLabel(wrapper, 'Referensi pembayaran').setValue('TRX-001')

    expect(wrapper.emitted('update:reference')?.[0]).toEqual(['TRX-001'])
  })
})
