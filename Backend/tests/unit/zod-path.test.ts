import { describe, expect, it } from 'vitest'
import { formatZodPath } from '../../src/utils/zod-path.js'

describe('formatZodPath', () => {
  it('memformat path bersarang dengan indeks array', () => {
    expect(formatZodPath(['items', 0, 'quantity'])).toBe('items[0].quantity')
  })

  it('memformat path field biasa', () => {
    expect(formatZodPath(['email'])).toBe('email')
  })

  it('mengembalikan string kosong untuk path kosong', () => {
    expect(formatZodPath([])).toBe('')
  })
})
