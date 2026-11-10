import { describe, expect, it } from 'vitest'
import { barcodeFormat } from '../barcode'

describe('barcodeFormat', () => {
  it('memakai EAN13 untuk 13 digit dengan check digit valid', () => {
    expect(barcodeFormat('4006381333931')).toBe('EAN13')
  })

  it('memakai UPC untuk 12 digit dengan check digit valid', () => {
    expect(barcodeFormat('036000291452')).toBe('UPC')
  })

  it('jatuh ke CODE128 saat check digit salah', () => {
    expect(barcodeFormat('8995000000060')).toBe('CODE128')
  })

  it('jatuh ke CODE128 untuk panjang lain', () => {
    expect(barcodeFormat('20012345678')).toBe('CODE128')
    expect(barcodeFormat('123456789012345')).toBe('CODE128')
  })
})
