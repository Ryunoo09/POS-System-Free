import { describe, expect, it, vi } from 'vitest'
import { cacheKeys, filterHash, namespaceVersionKey } from '../../src/cache/cache-keys.js'
import { createCacheService } from '../../src/cache/cache.service.js'
import { asRedisClient, createFakeRedis } from '../helpers/fake-redis.js'

describe('CacheService tanpa Redis', () => {
  const service = createCacheService(null)

  it('melaporkan dirinya nonaktif', async () => {
    expect(service.enabled).toBe(false)
    await expect(service.ping()).resolves.toBe('disabled')
  })

  it('selalu memanggil loader (tidak ada cache)', async () => {
    const loader = vi.fn(async () => 'nilai')

    await expect(service.getOrSet('kunci', 60, loader)).resolves.toBe('nilai')
    await expect(service.getOrSet('kunci', 60, loader)).resolves.toBe('nilai')
    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('del dan bumpVersion tidak melempar', async () => {
    await expect(service.del('a', 'b')).resolves.toBeUndefined()
    await expect(service.bumpVersion('products')).resolves.toBeUndefined()
  })
})

describe('CacheService dengan Redis', () => {
  it('cache miss memanggil loader lalu menyimpan dengan TTL ber-jitter', async () => {
    const fake = createFakeRedis()
    const service = createCacheService(asRedisClient(fake))
    const loader = vi.fn(async () => ({ id: 'produk-1' }))

    await expect(service.getOrSet('kunci', 100, loader)).resolves.toEqual({ id: 'produk-1' })

    expect(loader).toHaveBeenCalledTimes(1)
    expect(fake.store.has('kunci')).toBe(true)

    const ttl = fake.ttls[0] ?? 0
    expect(ttl).toBeGreaterThanOrEqual(90)
    expect(ttl).toBeLessThanOrEqual(110)
  })

  it('cache hit tidak memanggil loader', async () => {
    const fake = createFakeRedis()
    const service = createCacheService(asRedisClient(fake))
    const loader = vi.fn(async () => 'pertama')

    await service.getOrSet('kunci', 60, loader)
    await expect(service.getOrSet('kunci', 60, loader)).resolves.toBe('pertama')
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('hasil null tetap tersimpan (negative cache)', async () => {
    const fake = createFakeRedis()
    const service = createCacheService(asRedisClient(fake))
    const loader = vi.fn(async () => null)

    await expect(service.getOrSet('barcode:tidak-ada', 15, loader)).resolves.toBeNull()
    await expect(service.getOrSet('barcode:tidak-ada', 15, loader)).resolves.toBeNull()
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('payload rusak dianggap cache miss', async () => {
    const fake = createFakeRedis()
    fake.store.set('kunci', '{bukan json')
    const service = createCacheService(asRedisClient(fake))
    const loader = vi.fn(async () => 'dari-db')

    await expect(service.getOrSet('kunci', 60, loader)).resolves.toBe('dari-db')
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('kegagalan baca cache tidak menggagalkan request', async () => {
    const fake = createFakeRedis()
    fake.get = async () => {
      throw new Error('connection reset')
    }
    const service = createCacheService(asRedisClient(fake))
    const loader = vi.fn(async () => 'dari-db')

    await expect(service.getOrSet('kunci', 60, loader)).resolves.toBe('dari-db')
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('kegagalan tulis cache tidak menggagalkan request', async () => {
    const fake = createFakeRedis()
    fake.set = async () => {
      throw new Error('oom')
    }
    const service = createCacheService(asRedisClient(fake))

    await expect(service.getOrSet('kunci', 60, async () => 'dari-db')).resolves.toBe('dari-db')
  })

  it('melewati cache saat koneksi belum ready', async () => {
    const fake = createFakeRedis({ status: 'connecting' })
    const service = createCacheService(asRedisClient(fake))
    const loader = vi.fn(async () => 'dari-db')

    await service.getOrSet('kunci', 60, loader)
    await service.getOrSet('kunci', 60, loader)

    expect(loader).toHaveBeenCalledTimes(2)
    expect(fake.store.has('kunci')).toBe(false)
    await expect(service.currentVersion('products')).resolves.toBe('0')
  })

  it('single-flight: request paralel memakai satu loader', async () => {
    const fake = createFakeRedis()
    const service = createCacheService(asRedisClient(fake))
    let release = (): void => undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const loader = vi.fn(async () => {
      await gate
      return 'hasil'
    })

    const calls = [1, 2, 3, 4, 5].map(() => service.getOrSet('kunci', 60, loader))
    release()
    await Promise.all(calls)

    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('bumpVersion membuat key versi lama ditinggalkan', async () => {
    const fake = createFakeRedis()
    const service = createCacheService(asRedisClient(fake))
    const first = vi.fn(async () => 'versi-0')
    const second = vi.fn(async () => 'versi-1')

    await service.getOrSetVersioned('products', (v) => `k:v${v}`, 60, first)
    expect(fake.store.has('k:v0')).toBe(true)

    await service.bumpVersion('products')
    await expect(service.currentVersion('products')).resolves.toBe('1')

    await expect(
      service.getOrSetVersioned('products', (v) => `k:v${v}`, 60, second),
    ).resolves.toBe('versi-1')
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('ping mengembalikan ok saat terhubung', async () => {
    const service = createCacheService(asRedisClient(createFakeRedis()))

    await expect(service.ping()).resolves.toBe('ok')
  })
})

describe('cacheKeys', () => {
  it('filterHash stabil terhadap urutan dan besar-kecil huruf', () => {
    expect(filterHash({ search: 'Indomie', page: 1 })).toBe(
      filterHash({ page: 1, search: 'indomie ' }),
    )
  })

  it('membedakan scope harga modal agar data tidak bocor antar-role', () => {
    expect(cacheKeys.productDetail('0', 'p1', true)).not.toBe(
      cacheKeys.productDetail('0', 'p1', false),
    )
  })

  it('memakai prefix env dan namespace versi', () => {
    expect(namespaceVersionKey('products')).toContain(':ver:products')
    expect(cacheKeys.loginRateLimit('127.0.0.1', 'abc')).toContain(':rl:login:')
  })
})
