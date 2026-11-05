import { describe, expect, it } from 'vitest'
import { safeRedirectPath } from '../navigation'

describe('safeRedirectPath', () => {
  it('menerima path internal', () => {
    expect(safeRedirectPath('/products?page=2')).toBe('/products?page=2')
  })

  it('menolak protocol-relative dan URL eksternal', () => {
    expect(safeRedirectPath('//evil.example')).toBeNull()
    expect(safeRedirectPath('https://evil.example')).toBeNull()
  })

  it('menolak nilai non-string', () => {
    expect(safeRedirectPath(undefined)).toBeNull()
    expect(safeRedirectPath(['/products'])).toBeNull()
  })
})
