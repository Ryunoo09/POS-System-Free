import { ref } from 'vue'
import { defineStore } from 'pinia'
import { backupService } from '@/services/backup.service'
import type { BackupFile, RestoreBackupPayload } from '@/types/backup'
import { errorMessage } from '@/utils/errors'

export const useBackupStore = defineStore('backup', () => {
  const items = ref<BackupFile[]>([])
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref('')

  const fetchBackups = async (): Promise<void> => {
    isLoading.value = true
    error.value = ''

    try {
      items.value = await backupService.list()
    } catch (err) {
      error.value = errorMessage(err, 'Gagal memuat daftar backup.')
    } finally {
      isLoading.value = false
    }
  }

  const createBackup = async (): Promise<BackupFile> => {
    isSaving.value = true

    try {
      return await backupService.create()
    } finally {
      isSaving.value = false
    }
  }

  const restoreBackup = async (payload: RestoreBackupPayload): Promise<void> => {
    isSaving.value = true

    try {
      await backupService.restore(payload)
    } finally {
      isSaving.value = false
    }
  }

  const downloadBackup = async (filename: string): Promise<void> => {
    const blob = await backupService.download(filename)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = filename
    link.click()

    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  return {
    items,
    isLoading,
    isSaving,
    error,
    fetchBackups,
    createBackup,
    restoreBackup,
    downloadBackup,
  }
})
