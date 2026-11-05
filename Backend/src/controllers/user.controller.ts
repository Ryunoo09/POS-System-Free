import type { RequestHandler } from 'express'
import type { UserService } from '../services/user.service.js'
import { requireActor } from '../utils/request.js'
import { sendSuccess } from '../utils/response.js'
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from '../validators/user.validator.js'

export interface UserController {
  list: RequestHandler
  create: RequestHandler
  update: RequestHandler
}

export const createUserController = ({
  userService,
}: {
  userService: UserService
}): UserController => ({
  list: async (req, res) => {
    const query = req.validated?.query as ListUsersQuery
    const result = await userService.list(query)

    return sendSuccess(res, { data: result.items, meta: result.meta })
  },

  create: async (req, res) => {
    const input = req.validated?.body as CreateUserInput
    const data = await userService.create(input)

    return sendSuccess(res, { statusCode: 201, message: 'Pengguna berhasil dibuat', data })
  },

  update: async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    const input = req.validated?.body as UpdateUserInput
    const actor = requireActor(req)
    const data = await userService.update(id, input, actor.id)

    return sendSuccess(res, { message: 'Pengguna berhasil diperbarui', data })
  },
})
