import { ConflictError, NotFoundError } from '../errors/app-errors.js'
import { toSupplierDto, type SupplierDto } from '../mappers/supplier.mapper.js'
import type { SupplierRepository } from '../repositories/supplier.repository.js'
import type { AuditRecorder } from './audit.service.js'
import type { PaginationMeta } from '../types/http.js'
import { buildPaginationMeta, toSkip } from '../utils/pagination.js'
import type {
  CreateSupplierInput,
  ListSuppliersQuery,
  UpdateSupplierInput,
} from '../validators/supplier.validator.js'

export interface SupplierActor {
  id: string
  ipAddress?: string | null
  userAgent?: string | null
}

export interface SupplierService {
  list: (
    query: ListSuppliersQuery,
  ) => Promise<{ items: SupplierDto[]; meta: PaginationMeta }>
  detail: (id: string) => Promise<SupplierDto>
  create: (input: CreateSupplierInput, actor: SupplierActor) => Promise<SupplierDto>
  update: (id: string, input: UpdateSupplierInput, actor: SupplierActor) => Promise<SupplierDto>
  remove: (id: string, actor: SupplierActor) => Promise<SupplierDto>
}

const notFound = (): never => {
  throw new NotFoundError('Supplier tidak ditemukan', 'NOT_FOUND')
}

export const createSupplierService = ({
  supplierRepository,
  audit,
}: {
  supplierRepository: SupplierRepository
  audit?: AuditRecorder
}): SupplierService => {
  const findOrFail = async (id: string) => {
    const supplier = await supplierRepository.findById(id)
    return supplier ?? notFound()
  }

  const assertNameAvailable = async (name: string, excludeId?: string): Promise<void> => {
    const existing = await supplierRepository.findByName(name, excludeId)

    if (existing) {
      throw new ConflictError('Nama supplier sudah digunakan', 'DUPLICATE_SUPPLIER', [
        { field: 'name', message: 'Nama supplier sudah digunakan' },
      ])
    }
  }

  return {
    list: async (query) => {
      const { items, total } = await supplierRepository.list({
        skip: toSkip(query.page, query.limit),
        take: query.limit,
        search: query.search,
        isActive: query.is_active,
      })

      return {
        items: items.map(toSupplierDto),
        meta: buildPaginationMeta(query.page, query.limit, total),
      }
    },

    detail: async (id) => {
      const supplier = await findOrFail(id)
      const purchaseOrders = await supplierRepository.countPurchaseOrders(id)

      return toSupplierDto({ ...supplier, _count: { purchaseOrders } })
    },

    create: async (input, actor) => {
      await assertNameAvailable(input.name)

      const created = await supplierRepository.create({
        name: input.name,
        contact: input.contact ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        address: input.address ?? null,
      })

      await audit?.record({
        userId: actor.id,
        action: 'CREATE',
        entity: 'SUPPLIER',
        entityId: created.id,
        newValue: { name: created.name },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      })

      return toSupplierDto(created)
    },

    update: async (id, input, actor) => {
      const existing = await findOrFail(id)

      if (input.name !== undefined && input.name !== existing.name) {
        await assertNameAvailable(input.name, id)
      }

      const updated = await supplierRepository.update(id, {
        name: input.name,
        contact: input.contact,
        phone: input.phone,
        email: input.email,
        address: input.address,
        isActive: input.is_active,
      })

      await audit?.record({
        userId: actor.id,
        action: 'UPDATE',
        entity: 'SUPPLIER',
        entityId: id,
        oldValue: { name: existing.name, is_active: existing.isActive },
        newValue: { name: updated.name, is_active: updated.isActive },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      })

      return toSupplierDto(updated)
    },

    remove: async (id, actor) => {
      const existing = await findOrFail(id)
      const poCount = await supplierRepository.countPurchaseOrders(id)

      if (poCount > 0) {
        throw new ConflictError(
          `Supplier masih dipakai ${poCount} purchase order. Nonaktifkan sebagai gantinya.`,
          'SUPPLIER_IN_USE',
          [{ field: 'id', message: `Supplier masih dipakai ${poCount} purchase order` }],
        )
      }

      const deleted = await supplierRepository.delete(id)

      await audit?.record({
        userId: actor.id,
        action: 'DELETE',
        entity: 'SUPPLIER',
        entityId: id,
        oldValue: { name: existing.name },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      })

      return toSupplierDto({ ...deleted, _count: { purchaseOrders: 0 } })
    },
  }
}