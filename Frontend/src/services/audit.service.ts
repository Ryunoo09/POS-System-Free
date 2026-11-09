import { http } from './api'
import type { ListResult } from '@/types/api'
import type { AuditActor, AuditLog, AuditLogParams } from '@/types/audit'

export const auditService = {
  async list(params: AuditLogParams): Promise<ListResult<AuditLog>> {
    return http.getList<AuditLog>('/audit-logs', { params })
  },

  async getActors(): Promise<AuditActor[]> {
    const response = await http.get<AuditActor[]>('/audit-logs/actors')
    return response.data
  },
}