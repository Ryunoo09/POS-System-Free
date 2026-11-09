import { ref } from 'vue'
import { defineStore } from 'pinia'
import { auditService } from '@/services/audit.service'
import type { PaginationMeta } from '@/types/api'
import type { AuditActor, AuditLog, AuditLogParams } from '@/types/audit'
import { errorMessage } from '@/utils/errors'
import { emptyPaginationMeta } from '@/utils/pagination'

export const useAuditStore = defineStore('audit', () => {
  const items = ref<AuditLog[]>([])
  const actors = ref<AuditActor[]>([])
  const meta = ref<PaginationMeta>(emptyPaginationMeta())
  const isLoading = ref(false)
  const error = ref('')

  const fetchLogs = async (params: AuditLogParams): Promise<void> => {
    isLoading.value = true
    error.value = ''

    try {
      const result = await auditService.list(params)
      items.value = result.items
      meta.value = result.meta
    } catch (err) {
      error.value = errorMessage(err, 'Gagal memuat log aktivitas.')
    } finally {
      isLoading.value = false
    }
  }

  const fetchActors = async (): Promise<void> => {
    try {
      actors.value = await auditService.getActors()
    } catch {
      actors.value = []
    }
  }

  return { items, actors, meta, isLoading, error, fetchLogs, fetchActors }
})