/**
 * Membandingkan dua snapshot datar dan mengembalikan hanya field yang berubah.
 * Dipakai untuk mengisi `old_value`/`new_value` pada audit log agar ringkas.
 */
export const buildFieldDiff = (
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): { oldValue: Record<string, unknown>; newValue: Record<string, unknown> } | null => {
  const oldValue: Record<string, unknown> = {}
  const newValue: Record<string, unknown> = {}
  let changed = false

  for (const key of Object.keys(after)) {
    if (before[key] !== after[key]) {
      oldValue[key] = before[key]
      newValue[key] = after[key]
      changed = true
    }
  }

  return changed ? { oldValue, newValue } : null
}