const EAN13_BASE_LENGTH = 12

/** GS1 in-store prefix range (200–299) untuk barcode internal toko. */
const INTERNAL_PREFIX = '2'

export const ean13CheckDigit = (base: string): number => {
  if (!new RegExp(`^\\d{${EAN13_BASE_LENGTH}}$`).test(base)) {
    throw new Error('EAN-13 base harus 12 digit')
  }

  let sum = 0

  for (let index = 0; index < base.length; index += 1) {
    sum += Number(base[index]) * (index % 2 === 0 ? 1 : 3)
  }

  return (10 - (sum % 10)) % 10
}

export const isValidEan13 = (barcode: string): boolean =>
  /^\d{13}$/.test(barcode) &&
  ean13CheckDigit(barcode.slice(0, EAN13_BASE_LENGTH)) === Number(barcode[12])

/** Barcode internal (prefix 200–299) untuk produk tanpa barcode pabrikan. */
export const generateInternalEan13 = (random: () => number = Math.random): string => {
  let base = INTERNAL_PREFIX

  while (base.length < EAN13_BASE_LENGTH) {
    base += Math.floor(random() * 10)
  }

  return `${base}${ean13CheckDigit(base)}`
}
