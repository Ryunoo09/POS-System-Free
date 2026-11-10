<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppModal from '@/components/common/AppModal.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import { useNotification } from '@/composables/useNotification'
import { useBackupStore } from '@/stores/backup.store'
import type { BackupFile } from '@/types/backup'
import { errorMessage } from '@/utils/errors'
import { formatDateTime } from '@/utils/format'

const store = useBackupStore()
const notify = useNotification()

const restoring = ref<BackupFile | null>(null)
const password = ref('')
const confirmation = ref('')
const restoreError = ref('')

const canRestore = computed(
  () => password.value.length > 0 && confirmation.value === 'RESTORE',
)

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`

  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`
}

const load = (): void => {
  void store.fetchBackups()
}

onMounted(load)

const createBackup = async (): Promise<void> => {
  try {
    const file = await store.createBackup()
    notify.success(`Backup ${file.filename} berhasil dibuat`)
    load()
  } catch (error) {
    notify.error(errorMessage(error, 'Gagal membuat backup.'))
  }
}

const download = async (file: BackupFile): Promise<void> => {
  try {
    await store.downloadBackup(file.filename)
  } catch (error) {
    notify.error(errorMessage(error, 'Gagal mengunduh backup.'))
  }
}

const openRestore = (file: BackupFile): void => {
  restoring.value = file
  password.value = ''
  confirmation.value = ''
  restoreError.value = ''
}

const submitRestore = async (): Promise<void> => {
  if (!restoring.value || !canRestore.value) return

  restoreError.value = ''

  try {
    await store.restoreBackup({
      filename: restoring.value.filename,
      password: password.value,
      confirmation: 'RESTORE',
    })
    notify.success('Database berhasil dipulihkan dari backup')
    restoring.value = null
    load()
  } catch (error) {
    restoreError.value = errorMessage(error, 'Gagal memulihkan database.')
  }
}
</script>

<template>
  <section class="space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-[28px] font-semibold tracking-tight text-ink">Backup &amp; Restore</h1>
        <p class="mt-1 text-sm text-ink-3">
          Amankan data penjualan dan pulihkan database dari cadangan. Hanya untuk Owner dan Admin.
        </p>
      </div>
      <AppButton :loading="store.isSaving" @click="createBackup">Buat Backup</AppButton>
    </header>

    <div class="overflow-hidden rounded-xl border border-border bg-surface">
      <div v-if="store.isLoading" class="space-y-3 p-4">
        <SkeletonBlock v-for="index in 4" :key="index" height="2.25rem" />
      </div>

      <ErrorState v-else-if="store.error" :message="store.error" @retry="load" />

      <EmptyState
        v-else-if="store.items.length === 0"
        title="Belum ada file backup"
        description="Buat backup pertama untuk menyimpan salinan database."
      >
        <template #action>
          <AppButton size="sm" :loading="store.isSaving" @click="createBackup">Buat Backup</AppButton>
        </template>
      </EmptyState>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-border text-sm">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wide text-ink-3">
              <th scope="col" class="px-4 py-3 font-medium">Nama file</th>
              <th scope="col" class="hidden px-4 py-3 font-medium md:table-cell">Waktu</th>
              <th scope="col" class="px-4 py-3 text-right font-medium">Ukuran</th>
              <th scope="col" class="px-4 py-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-border">
            <tr v-for="file in store.items" :key="file.filename" class="hover:bg-surface-2">
              <td class="px-4 py-3 font-medium text-ink">{{ file.filename }}</td>
              <td class="hidden px-4 py-3 text-ink-2 md:table-cell">
                {{ formatDateTime(file.created_at) }}
              </td>
              <td class="px-4 py-3 text-right text-ink-2">{{ formatBytes(file.size_bytes) }}</td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-2">
                  <AppButton variant="ghost" size="sm" @click="download(file)">Unduh</AppButton>
                  <AppButton variant="secondary" size="sm" @click="openRestore(file)">
                    Pulihkan
                  </AppButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <AppModal
      :open="Boolean(restoring)"
      title="Pulihkan Database"
      max-width="sm"
      @close="restoring = null"
    >
      <div v-if="restoring" class="space-y-4">
        <div class="rounded-lg border border-negative bg-negative-soft px-3 py-2 text-sm text-negative">
          <p class="font-semibold">Tindakan ini menimpa seluruh data saat ini.</p>
          <p class="mt-1">
            Data yang ada sekarang akan diganti oleh isi
            <span class="font-medium">{{ restoring.filename }}</span>. Pastikan tidak ada transaksi
            yang sedang berjalan.
          </p>
        </div>

        <AppInput
          v-model="password"
          type="password"
          label="Password Anda"
          autocomplete="current-password"
          placeholder="Masukkan password akun"
        />

        <AppInput
          v-model="confirmation"
          label="Konfirmasi"
          placeholder="Ketik RESTORE"
          hint="Ketik RESTORE (huruf kapital) untuk mengaktifkan tombol."
        />

        <p v-if="restoreError" class="rounded-lg bg-negative-soft px-3 py-2 text-sm text-negative">
          {{ restoreError }}
        </p>
      </div>

      <template #footer>
        <AppButton variant="secondary" :disabled="store.isSaving" @click="restoring = null">
          Batal
        </AppButton>
        <AppButton
          variant="danger"
          :loading="store.isSaving"
          :disabled="!canRestore"
          @click="submitRestore"
        >
          Pulihkan Sekarang
        </AppButton>
      </template>
    </AppModal>
  </section>
</template>
