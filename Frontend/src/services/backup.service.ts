import { api, http } from './api'
import type { BackupFile, RestoreBackupPayload } from '@/types/backup'

export const backupService = {
  async list(): Promise<BackupFile[]> {
    const response = await http.get<BackupFile[]>('/backup/list')
    return response.data
  },

  async create(): Promise<BackupFile> {
    const response = await http.post<BackupFile>('/backup/create')
    return response.data
  },

  async restore(payload: RestoreBackupPayload): Promise<void> {
    await http.post<null>('/backup/restore', payload)
  },

  async download(filename: string): Promise<Blob> {
    const response = await api.get<Blob>(`/backup/download/${encodeURIComponent(filename)}`, {
      responseType: 'blob',
    })

    return response.data
  },
}
