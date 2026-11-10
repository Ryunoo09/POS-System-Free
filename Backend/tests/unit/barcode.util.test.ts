import { describe, expect, it } from 'vitest'
import {
  ean13CheckDigit,
  generateInternalEan13,
  isValidEan13,
} from '../../src/utils/barcode.js'

describe('ean13CheckDigit', () => {
  it('menghitung check digit sesuai standar GS1', () => {
    expect(ean13CheckDigit('400638133393')).toBe(1)
    expect(ean13CheckDigit('200123456789')).toBe(3)
  })

  it('menolak base bukan 12 digit', () => {
    expect(() => ean13CheckDigit('123')).toThrow()
  })
})

describe('isValidEan13', () => {
  it('menerima EAN-13 valid', () => {
    expect(isValidEan13('4006381333931')).toBe(true)
  })

  it('menolak check digit salah', () => {
    expect(isValidEan13('4006381333930')).toBe(false)
  })

  it('menolak panjang selain 13 digit', () => {
    expect(isValidEan13('12345678')).toBe(false)
  })
})

describe('generateInternalEan13', () => {
  it('menghasilkan 13 digit valid dengan prefix in-store 2xx', () => {
    const barcode = generateInternalEan13(() => 0.5)

    expect(barcode).toHaveLength(13)
    expect(barcode.startsWith('2')).toBe(true)
    expect(isValidEan13(barcode)).toBe(true)
  })

  it('menerima sumber acak deterministik untuk pengujian', () => {
    expect(generateInternalEan13(() => 0)).toBe(generateInternalEan13(() => 0))
  })
})
