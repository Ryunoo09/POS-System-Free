import type { Request, RequestHandler } from 'express'
import type { SupplierActor, SupplierService } from '../services/supplier.service.js'
import type { AuthUser } from '../types/auth.js'
import { auditContextFrom, requireActor } from '../utils/request.js'
import { sendSuccess } from '../utils/response.js'
import type {
  CreateSupplierInput,
  ListSuppliersQuery,
  UpdateSupplierInput,
} from '../validators/supplier.validator.js'

export interface SupplierController {
  list: RequestHandler
  detail: RequestHandler
  create: RequestHandler
  update: RequestHandler
  remove: RequestHandler
}

const toActor = (user: AuthUser, req: Request): SupplierActor => ({
  id: user.id,
  ...auditContextFrom(req),
})

export const createSupplierController = ({
  supplierService,
}: {
  supplierService: SupplierService
}): SupplierController => ({
  list: async (req, res) => {
    const query = req.validated?.query as ListSuppliersQuery
    const result = await supplierService.list(query)

    return sendSuccess(res, { data: result.items, meta: result.meta })
  },

  detail: async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    const data = await supplierService.detail(id)

    return sendSuccess(res, { data })
  },

  create: async (req, res) => {
    const input = req.validated?.body as CreateSupplierInput
    const actor = toActor(requireActor(req), req)
    const data = await supplierService.create(input, actor)

    return sendSuccess(res, { statusCode: 201, message: 'Supplier berhasil dibuat', data })
  },

  update: async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    const input = req.validated?.body as UpdateSupplierInput
    const actor = toActor(requireActor(req), req)
    const data = await supplierService.update(id, input, actor)

    return sendSuccess(res, { message: 'Supplier berhasil diperbarui', data })
  },

  remove: async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    const actor = toActor(requireActor(req), req)
    await supplierService.remove(id, actor)

    return sendSuccess(res, { message: 'Supplier berhasil dihapus', data: null })
  },
})