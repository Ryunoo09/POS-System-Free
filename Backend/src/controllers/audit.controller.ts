import type { RequestHandler } from 'express'
import type { AuditService } from '../services/audit.service.js'
import { sendSuccess } from '../utils/response.js'
import type { ListAuditLogsQuery } from '../validators/audit.validator.js'

export interface AuditController {
  list: RequestHandler
}

export const createAuditController = ({
  auditService,
}: {
  auditService: AuditService
}): AuditController => ({
  list: async (req, res) => {
    const query = req.validated?.query as ListAuditLogsQuery
    const result = await auditService.list(query)

    return sendSuccess(res, { data: result.items, meta: result.meta })
  },
})