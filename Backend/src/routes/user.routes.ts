import { Router, type RequestHandler, type Router as ExpressRouter } from 'express'
import { PERMISSIONS } from '../constants/permissions.js'
import type { UserController } from '../controllers/user.controller.js'
import { authorize } from '../middlewares/authorize.js'
import { validate } from '../middlewares/validate.js'
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  userIdParamSchema,
} from '../validators/user.validator.js'

export const createUserRoutes = ({
  userController,
  authenticate,
}: {
  userController: UserController
  authenticate: RequestHandler
}): ExpressRouter => {
  const router = Router()

  router.use(authenticate)
  router.use(authorize(PERMISSIONS.USER_MANAGE))

  router.get('/', validate({ query: listUsersQuerySchema }), userController.list)
  router.post('/', validate({ body: createUserSchema }), userController.create)
  router.put(
    '/:id',
    validate({ params: userIdParamSchema, body: updateUserSchema }),
    userController.update,
  )

  return router
}
