import { Router, type RequestHandler, type Router as ExpressRouter } from 'express'
import { PERMISSIONS } from '../constants/permissions.js'
import type { CategoryController } from '../controllers/category.controller.js'
import { authorize } from '../middlewares/authorize.js'
import { validate } from '../middlewares/validate.js'
import {
  categoryIdParamSchema,
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
} from '../validators/category.validator.js'

export const createCategoryRoutes = ({
  categoryController,
  authenticate,
}: {
  categoryController: CategoryController
  authenticate: RequestHandler
}): ExpressRouter => {
  const router = Router()

  router.use(authenticate)

  router.get(
    '/',
    authorize(PERMISSIONS.CATEGORY_READ),
    validate({ query: listCategoriesQuerySchema }),
    categoryController.list,
  )
  router.post(
    '/',
    authorize(PERMISSIONS.CATEGORY_WRITE),
    validate({ body: createCategorySchema }),
    categoryController.create,
  )
  router.put(
    '/:id',
    authorize(PERMISSIONS.CATEGORY_WRITE),
    validate({ params: categoryIdParamSchema, body: updateCategorySchema }),
    categoryController.update,
  )
  router.delete(
    '/:id',
    authorize(PERMISSIONS.CATEGORY_WRITE),
    validate({ params: categoryIdParamSchema }),
    categoryController.remove,
  )

  return router
}
