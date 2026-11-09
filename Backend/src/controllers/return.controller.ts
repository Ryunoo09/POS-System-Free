import type { Request, RequestHandler } from 'express'
import { PERMISSIONS } from '../constants/permissions.js'
import type { ReturnActor, ReturnService } from '../services/return.service.js'
import type { AuthUser } from '../types/auth.js'
import { auditContextFrom, requireActor } from '../utils/request.js'
import { sendSuccess } from '../utils/response.js'
import type { CreateReturnInput, ListReturnsQuery } from '../validators/return.validator.js'

export interface ReturnController {
  list: RequestHandler
  detail: RequestHandler
  create: RequestHandler
}

const toActor = (user: AuthUser, req: Request): ReturnActor => ({
  id: user.id,
  name: user.name,
  canReadAll: user.permissions.includes(PERMISSIONS.TRANSACTION_READ_ALL),
  ...auditContextFrom(req),
})

export const createReturnController = ({
  returnService,
}: {
  returnService: ReturnService
}): ReturnController => ({
  list: async (req, res) => {
    const query = req.validated?.query as ListReturnsQuery
    const actor = toActor(requireActor(req), req)
    const result = await returnService.list(query, actor)

    return sendSuccess(res, { data: result.items, meta: result.meta })
  },

  detail: async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    const actor = toActor(requireActor(req), req)
    const data = await returnService.detail(id, actor)

    return sendSuccess(res, { data })
  },

  create: async (req, res) => {
    const input = req.validated?.body as CreateReturnInput
    const actor = toActor(requireActor(req), req)
    const data = await returnService.create(input, actor)

    return sendSuccess(res, { statusCode: 201, message: 'Retur berhasil dibuat', data })
  },
})