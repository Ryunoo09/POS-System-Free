import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { ListResult, PaginationMeta } from '@/types/api'
import type { AuditActor, AuditLog, AuditLogParams } from '@/types/audit'

const mocks = vi.hoisted(() => ({
  list: vi.fn<(params: AuditLogParams) => Promise<ListResult<AuditLog>>>(),
  getActors: vi.fn<() => Promise<AuditActor[]>>(),
}))

vi.mock('@/services/audit.service', () => ({
  auditService: {
    list: mocks.list,
    getActors: mocks.getActors,
  },
}))

const { useAuditStore } = await import('../audit.store')

const meta: PaginationMeta = { page: 1, limit: 15, total_items: 1, total_pages: 1 }

const log: AuditLog = {
  id: 'log-1',
  user: { id: 'user-1', name: 'Admin' },
  action: 'UPDATE',
  entity: 'PRODUCT',
  entity_id: 'product-1',
  old_value: { selling_price: '1500.00' },
  new_value: { selling_price: '2000.00' },
  ip_address: '127.0.0.1',
  user_agent: 'vitest',
  created_at: '2026-11-09T10:00:00Z',
}

describe('audit.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('memuat log dan meta paginasi', async () => {
    mocks.list.mockResolvedValue({ items: [log], meta })
    const store = useAuditStore()

    await store.fetchLogs({ page: 1, limit: 15 })

    expect(mocks.list).toHaveBeenCalledWith({ page: 1, limit: 15 })
    expect(store.items).toHaveLength(1)
    expect(store.meta.total_items).toBe(1)
  })

  it('menyimpan pesan error saat pemuatan gagal', async () => {
    mocks.list.mockRejectedValue(new Error('gagal'))
    const store = useAuditStore()

    await store.fetchLogs({ page: 1, limit: 15 })

    expect(store.items).toHaveLength(0)
    expect(store.error).toBe('Gagal memuat log aktivitas.')
  })

  it('memuat opsi aktor', async () => {
    mocks.getActors.mockResolvedValue([{ id: 'user-1', name: 'Admin' }])
    const store = useAuditStore()

    await store.fetchActors()

    expect(store.actors).toEqual([{ id: 'user-1', name: 'Admin' }])
  })

  it('mengosongkan opsi aktor bila pemuatan gagal', async () => {
    mocks.getActors.mockRejectedValue(new Error('gagal'))
    const store = useAuditStore()

    await store.fetchActors()

    expect(store.actors).toEqual([])
  })
})