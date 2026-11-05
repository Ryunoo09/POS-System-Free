const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat('id-ID')

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeZone: 'Asia/Jakarta',
})

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Jakarta',
})

const normalizeSpaces = (value: string) => value.replace(/\u00A0/g, ' ')

export const parseDecimal = (value: string | number): number => Number(value)

export const formatRupiah = (value: string | number): string =>
  normalizeSpaces(rupiahFormatter.format(parseDecimal(value)))

export const formatNumber = (value: string | number): string =>
  numberFormatter.format(parseDecimal(value))

export const formatDate = (value: string | Date): string =>
  dateFormatter.format(new Date(value))

export const formatDateTime = (value: string | Date): string =>
  dateTimeFormatter.format(new Date(value))
