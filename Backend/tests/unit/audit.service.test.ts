import { describe, expect, it, vi } from 'vitest'
import { createAuditService } from '../../src/services/audit.service.js'
import type { AuditLogView, AuditRepository } from '../../src/repositories/audit.repository.js'

const buildRepository = (overrides: Partial<AuditRepository> = {}): AuditRepository => ({
  create: async () => {},
  list: async () => ({ items: [], total: 0 }),
  listActorOptions: async () => [],
  ...overrides,
})

const buildLog = (overrides: Partial<AuditLogView> = {}): AuditLogView => ({
  id: 'log-1',
  userId: 'user-1',
  action: 'UPDATE',
  entity: 'PRODUCT',
  entityId: 'product-1',
  oldValue: { selling_price: '1500.00' },
  newValue: { selling_price: '2000.00' },
  ipAddress: '127.0.0.1',
  userAgent: 'vitest',
  createdAt: new Date('2026-11-09T10:00:00Z'),
  user: { id: 'user-1', name: 'Admin' },
  ...overrides,
})

describe('AuditService.record', () => {
  it('meneruskan log dengan ip dan user agent ternormalisasi', async () => {
    const create = vi.fn<(data: Parameters<AuditRepository['create']>[0]) => Promise<void>>(
      async () => {},
    )
    const service = createAuditService(buildRepository({ create }))

    await service.record({
      userId: 'user-1',
      action: 'ADJUST',
      entity: 'INVENTORY',
      entityId: 'product-1',
      oldValue: { stock: 5 },
      newValue: { stock: 8 },
    })

    expect(create).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'ADJUST',
      entity: 'INVENTORY',
      entityId: 'product-1',
      oldValue: { stock: 5 },
      newValue: { stock: 8 },
      ipAddress: null,
      userAgent: null,
    })
  })

  it('tidak melempar error saat penyimpanan log gagal (best-effort)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const service = createAuditService(
      buildRepository({
        create: async () => {
          throw new Error('db down')
        },
      }),
    )

    await expect(
      service.record({
        userId: 'user-1',
        action: 'UPDATE',
        entity: 'PRODUCT',
        entityId: 'product-1',
      }),
    ).resolves.toBeUndefined()

    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('AuditService.list', () => {
  it('mengembalikan log ter-mapping beserta meta paginasi', async () => {
    const service = createAuditService(
      buildRepository({
        list: async () => ({ items: [buildLog()], total: 12 }),
      }),
    )

    const result = await service.list({ page: 1, limit: 5 })

    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      id: 'log-1',
      user: { id: 'user-1', name: 'Admin' },
      entity_id: 'product-1',
      old_value: { selling_price: '1500.00' },
      new_value: { selling_price: '2000.00' },
    })
    expect(result.meta).toEqual({ page: 1, limit: 5, total_items: 12, total_pages: 3 })
  })

  it('menormalkan old/new value null menjadi null', async () => {
    const service = createAuditService(
      buildRepository({
        list: async () => ({
          items: [buildLog({ oldValue: null, newValue: null })],
          total: 1,
        }),
      }),
    )

    const result = await service.list({ page: 1, limit: 10 })

    expect(result.items[0]?.old_value).toBeNull()
    expect(result.items[0]?.new_value).toBeNull()
  })
})

describe('AuditService.listActors', () => {
  it('meneruskan daftar aktor dari repository', async () => {
    const actors = [{ id: 'user-1', name: 'Admin' }]
    const service = createAuditService(
      buildRepository({ listActorOptions: async () => actors }),
    )

    await expect(service.listActors()).resolves.toEqual(actors)
  })
})