import { describe, expect, it } from 'vitest'
import { toCategoryParams, toProductParams, toUserParams } from '../query'

describe('toProductParams', () => {
  it('mengirim filter yang terisi dan memangkas spasi pencarian', () => {
    expect(
      toProductParams({ search: '  kopi  ', category_id: 'cat-1', is_active: 'true' }, 2, 20),
    ).toEqual({
      page: 2,
      limit: 20,
      search: 'kopi',
      category_id: 'cat-1',
      is_active: 'true',
    })
  })

  it('hanya mengirim page dan limit saat filter kosong', () => {
    expect(toProductParams({ search: '   ', category_id: '', is_active: '' }, 1)).toEqual({
      page: 1,
      limit: 10,
    })
  })
})

describe('toCategoryParams', () => {
  it('menyertakan status aktif bila dipilih', () => {
    expect(toCategoryParams({ search: 'minuman', is_active: 'false' }, 3)).toEqual({
      page: 3,
      limit: 10,
      search: 'minuman',
      is_active: 'false',
    })
  })
})

describe('toUserParams', () => {
  it('menyertakan role dan status bila dipilih', () => {
    expect(
      toUserParams({ search: 'siti', role: 'CASHIER', is_active: 'true' }, 1, 50),
    ).toEqual({
      page: 1,
      limit: 50,
      search: 'siti',
      role: 'CASHIER',
      is_active: 'true',
    })
  })
})