import type { Request, RequestHandler } from 'express'
import { PERMISSIONS } from '../constants/permissions.js'
import type { ProductActor, ProductService } from '../services/product.service.js'
import type { AuthUser } from '../types/auth.js'
import { auditContextFrom, requireActor } from '../utils/request.js'
import { sendSuccess } from '../utils/response.js'
import type {
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from '../validators/product.validator.js'

export interface ProductController {
  list: RequestHandler
  getById: RequestHandler
  create: RequestHandler
  update: RequestHandler
  deactivate: RequestHandler
}

const toActor = (user: AuthUser, req: Request): ProductActor => ({
  id: user.id,
  canViewCostPrice: user.permissions.includes(PERMISSIONS.COST_PRICE_READ),
  isCashier: user.role === 'CASHIER',
  ...auditContextFrom(req),
})

export const createProductController = ({
  productService,
}: {
  productService: ProductService
}): ProductController => ({
  list: async (req, res) => {
    const query = req.validated?.query as ListProductsQuery
    const result = await productService.list(query, toActor(requireActor(req), req))

    return sendSuccess(res, { data: result.items, meta: result.meta })
  },

  getById: async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    const data = await productService.getById(id, toActor(requireActor(req), req))

    return sendSuccess(res, { data })
  },

  create: async (req, res) => {
    const input = req.validated?.body as CreateProductInput
    const data = await productService.create(input, toActor(requireActor(req), req))

    return sendSuccess(res, { statusCode: 201, message: 'Produk berhasil dibuat', data })
  },

  update: async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    const input = req.validated?.body as UpdateProductInput
    const data = await productService.update(id, input, toActor(requireActor(req), req))

    return sendSuccess(res, { message: 'Produk berhasil diperbarui', data })
  },

  deactivate: async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    const data = await productService.deactivate(id, toActor(requireActor(req), req))

    return sendSuccess(res, { message: 'Produk berhasil dinonaktifkan', data })
  },
})
