import type { RequestHandler } from 'express'
import type { CategoryActor, CategoryService } from '../services/category.service.js'
import type { AuthUser } from '../types/auth.js'
import { requireActor } from '../utils/request.js'
import { sendSuccess } from '../utils/response.js'
import type {
  CreateCategoryInput,
  ListCategoriesQuery,
  UpdateCategoryInput,
} from '../validators/category.validator.js'

export interface CategoryController {
  list: RequestHandler
  create: RequestHandler
  update: RequestHandler
  remove: RequestHandler
}

const toActor = (user: AuthUser): CategoryActor => ({ canViewAll: user.role !== 'CASHIER' })

export const createCategoryController = ({
  categoryService,
}: {
  categoryService: CategoryService
}): CategoryController => ({
  list: async (req, res) => {
    const query = req.validated?.query as ListCategoriesQuery
    const result = await categoryService.list(query, toActor(requireActor(req)))

    return sendSuccess(res, { data: result.items, meta: result.meta })
  },

  create: async (req, res) => {
    const input = req.validated?.body as CreateCategoryInput
    const data = await categoryService.create(input)

    return sendSuccess(res, { statusCode: 201, message: 'Kategori berhasil dibuat', data })
  },

  update: async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    const input = req.validated?.body as UpdateCategoryInput
    const data = await categoryService.update(id, input)

    return sendSuccess(res, { message: 'Kategori berhasil diperbarui', data })
  },

  remove: async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    await categoryService.remove(id)

    return sendSuccess(res, { message: 'Kategori berhasil dihapus', data: null })
  },
})
