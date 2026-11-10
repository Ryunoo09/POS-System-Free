export interface BackupFile {
  filename: string
  size_bytes: number
  created_at: string
}

export interface RestoreBackupPayload {
  filename: string
  password: string
  confirmation: 'RESTORE'
}
