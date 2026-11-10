<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppSelect from '@/components/common/AppSelect.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import { useAuditStore } from '@/stores/audit.store'
import type { AuditAction, AuditEntity, AuditLog, AuditLogParams } from '@/types/audit'
import { formatDateTime } from '@/utils/format'

type BadgeTone = 'success' | 'danger' | 'warning' | 'neutral'

const store = useAuditStore()

const actionLabels: Record<AuditAction, string> = {
  CREATE: 'Buat',
  UPDATE: 'Ubah',
  DELETE: 'Hapus',
  CANCEL: 'Batal',
  ADJUST: 'Penyesuaian',
  RESTORE: 'Pemulihan',
  LOGIN: 'Masuk',
}

const actionTones: Record<AuditAction, BadgeTone> = {
  CREATE: 'success',
  UPDATE: 'warning',
  DELETE: 'danger',
  CANCEL: 'danger',
  ADJUST: 'neutral',
  RESTORE: 'danger',
  LOGIN: 'neutral',
}

const entityLabels: Record<AuditEntity, string> = {
  PRODUCT: 'Produk',
  USER: 'Pengguna',
  TRANSACTION: 'Transaksi',
  INVENTORY: 'Inventori',
  SHIFT: 'Shift',
  RETURN: 'Retur',
  BACKUP: 'Backup',
}

const actionOptions: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: 'Semua aksi' },
  ...(Object.keys(actionLabels) as AuditAction[]).map((value) => ({
    value,
    label: actionLabels[value],
  })),
]

const entityOptions: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: 'Semua entitas' },
  ...(Object.keys(entityLabels) as AuditEntity[]).map((value) => ({
    value,
    label: entityLabels[value],
  })),
]

const filters = ref({
  start_date: '',
  end_date: '',
  action: '',
  entity: '',
  user_id: '',
})

const page = ref(1)
const selected = ref<AuditLog | null>(null)

const userOptions = computed<ReadonlyArray<{ value: string; label: string }>>(() => [
  { value: '', label: 'Semua pengguna' },
  ...store.actors.map((actor) => ({ value: actor.id, label: actor.name })),
])

const params = computed<AuditLogParams>(() => {
  const query: AuditLogParams = { page: page.value, limit: 15 }

  if (filters.value.start_date) query.start_date = filters.value.start_date
  if (filters.value.end_date) query.end_date = filters.value.end_date
  if (filters.value.action) query.action = filters.value.action as AuditAction
  if (filters.value.entity) query.entity = filters.value.entity as AuditEntity
  if (filters.value.user_id) query.user_id = filters.value.user_id

  return query
})

const load = (): void => {
  void store.fetchLogs(params.value)
}

const pretty = (value: unknown): string =>
  value === null || value === undefined ? '—' : JSON.stringify(value, null, 2)

const oldValueText = computed(() => pretty(selected.value?.old_value))
const newValueText = computed(() => pretty(selected.value?.new_value))

watch(
  () => [filters.value.start_date, filters.value.end_date, filters.value.action, filters.value.entity, filters.value.user_id],
  () => {
    page.value = 1
    load()
  },
)

watch(page, load)

onMounted(() => {
  void store.fetchActors()
  load()
})
</script>

<template>
  <section class="space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-[28px] font-semibold tracking-tight text-ink">Log Aktivitas</h1>
        <p class="mt-1 text-sm text-ink-3">
          Jejak audit perubahan data penting. Bersifat hanya-baca dan tidak dapat diubah.
        </p>
      </div>
    </header>

    <div class="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
      <AppInput v-model="filters.start_date" type="date" label="Dari Tanggal" />
      <AppInput v-model="filters.end_date" type="date" label="Sampai Tanggal" />
      <AppSelect v-model="filters.action" label="Aksi" :options="actionOptions" />
      <AppSelect v-model="filters.entity" label="Entitas" :options="entityOptions" />
      <AppSelect v-model="filters.user_id" label="Pengguna" :options="userOptions" />
    </div>

    <div class="overflow-hidden rounded-xl border border-border bg-surface">
      <div v-if="store.isLoading" class="space-y-3 p-4">
        <SkeletonBlock v-for="index in 6" :key="index" height="2.25rem" />
      </div>

      <ErrorState v-else-if="store.error" :message="store.error" @retry="load" />

      <EmptyState
        v-else-if="store.items.length === 0"
        title="Belum ada log aktivitas"
        description="Aktivitas perubahan data akan tercatat di sini."
      />

      <template v-else>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-ink-3">
                <th scope="col" class="px-4 py-3 font-medium">Waktu</th>
                <th scope="col" class="px-4 py-3 font-medium">Pengguna</th>
                <th scope="col" class="px-4 py-3 font-medium">Aksi</th>
                <th scope="col" class="px-4 py-3 font-medium">Entitas</th>
                <th scope="col" class="px-4 py-3 font-medium">IP</th>
                <th scope="col" class="px-4 py-3 text-right font-medium">Detail</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-border">
              <tr v-for="log in store.items" :key="log.id" class="hover:bg-surface-2">
                <td class="whitespace-nowrap px-4 py-3 text-ink-2">
                  {{ formatDateTime(log.created_at) }}
                </td>
                <td class="px-4 py-3 font-medium text-ink">
                  {{ log.user?.name ?? 'Sistem' }}
                </td>
                <td class="px-4 py-3">
                  <AppBadge :tone="actionTones[log.action]">
                    {{ actionLabels[log.action] ?? log.action }}
                  </AppBadge>
                </td>
                <td class="px-4 py-3 text-ink-2">
                  {{ entityLabels[log.entity] ?? log.entity }}
                </td>
                <td class="px-4 py-3 text-xs text-ink-3">{{ log.ip_address ?? '—' }}</td>
                <td class="px-4 py-3 text-right">
                  <AppButton variant="ghost" size="sm" @click="selected = log">Lihat</AppButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <PaginationBar :meta="store.meta" @change="page = $event" />
      </template>
    </div>

    <AppModal
      :open="Boolean(selected)"
      title="Detail Perubahan"
      max-width="lg"
      @close="selected = null"
    >
      <div v-if="selected" class="space-y-4">
        <dl class="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt class="text-xs text-ink-3">Aksi</dt>
            <dd class="mt-0.5 font-medium text-ink">
              {{ actionLabels[selected.action] ?? selected.action }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-ink-3">Entitas</dt>
            <dd class="mt-0.5 font-medium text-ink">
              {{ entityLabels[selected.entity] ?? selected.entity }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-ink-3">Pengguna</dt>
            <dd class="mt-0.5 font-medium text-ink">{{ selected.user?.name ?? 'Sistem' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-ink-3">Waktu</dt>
            <dd class="mt-0.5 font-medium text-ink">{{ formatDateTime(selected.created_at) }}</dd>
          </div>
        </dl>

        <p class="rounded-lg bg-surface-2 px-3 py-2 font-mono text-xs text-ink-2">
          ID entitas: {{ selected.entity_id }}
        </p>

        <div class="grid gap-3 md:grid-cols-2">
          <div>
            <p class="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-3">
              Nilai Lama
            </p>
            <pre class="max-h-64 overflow-auto rounded-lg bg-negative-soft/40 p-3 font-mono text-xs text-ink">{{ oldValueText }}</pre>
          </div>
          <div>
            <p class="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-3">
              Nilai Baru
            </p>
            <pre class="max-h-64 overflow-auto rounded-lg bg-accent-soft/40 p-3 font-mono text-xs text-ink">{{ newValueText }}</pre>
          </div>
        </div>
      </div>

      <template #footer>
        <AppButton variant="secondary" @click="selected = null">Tutup</AppButton>
      </template>
    </AppModal>
  </section>
</template>