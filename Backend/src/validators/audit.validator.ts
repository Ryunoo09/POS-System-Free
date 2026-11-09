import { z } from 'zod'
import { AUDIT_ACTIONS, AUDIT_ENTITIES, type AuditAction, type AuditEntity } from '../constants/audit.js'
import { DATE_PATTERN } from '../utils/date-range.js'
import { paginationSchema, uuidSchema } from './common.validator.js'

const dateSchema = z.string().regex(DATE_PATTERN, 'Format tanggal harus YYYY-MM-DD')

const actionValues = Object.values(AUDIT_ACTIONS) as [AuditAction, ...AuditAction[]]
const entityValues = Object.values(AUDIT_ENTITIES) as [AuditEntity, ...AuditEntity[]]

export const listAuditLogsQuerySchema = paginationSchema.extend({
  user_id: uuidSchema.optional(),
  action: z.enum(actionValues).optional(),
  entity: z.enum(entityValues).optional(),
  start_date: dateSchema.optional(),
  end_date: dateSchema.optional(),
})

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>