const ean13CheckDigit = (base: string): number => {
  let sum = 0

  for (let index = 0; index < base.length; index += 1) {
    sum += Number(base[index]) * (index % 2 === 0 ? 1 : 3)
  }

  return (10 - (sum % 10)) % 10
}

const hasCheckDigit = (value: string, base: string, expected: number): boolean =>
  ean13CheckDigit(base) === expected && value.length === base.length + 1

const isValidEan13 = (value: string): boolean =>
  /^\d{13}$/.test(value) && hasCheckDigit(value, value.slice(0, 12), Number(value[12]))

const isValidUpcA = (value: string): boolean =>
  /^\d{12}$/.test(value) && hasCheckDigit(`0${value}`, `0${value.slice(0, 11)}`, Number(value[11]))

/**
 * Pilih symbology sesuai panjang + check digit. Barcode manual yang tidak lolos
 * validasi dirender sebagai CODE128 (menerima digit apa pun) agar label tetap terbaca.
 */
export const barcodeFormat = (value: string): string => {
  if (isValidEan13(value)) return 'EAN13'
  if (isValidUpcA(value)) return 'UPC'
  return 'CODE128'
}
