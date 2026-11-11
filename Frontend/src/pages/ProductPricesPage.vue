<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppBadge from '@/components/common/AppBadge.vue'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import SkeletonBlock from '@/components/common/SkeletonBlock.vue'
import { useNotification } from '@/composables/useNotification'
import { useAuthStore } from '@/stores/auth.store'
import { usePricesStore } from '@/stores/prices.store'
import { useProductsStore } from '@/stores/products.store'
import type { PriceField, PriceSource } from '@/types/price'
import { errorMessage } from '@/utils/errors'
import { formatDateTime, formatRupiah } from '@/utils/format'
import { PERMISSIONS } from '@/utils/permissions'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const pricesStore = usePricesStore()
const productsStore = useProductsStore()
const notify = useNotification()

const productId = computed(() => String(route.params.id))
const canWrite = computed(() => auth.hasPermission(PERMISSIONS.PRODUCT_WRITE))
const product = computed(() => productsStore.detail)

const form = reactive({ selling_price: '', effective_date: '', reason: '' })
const formError = ref('')

const fieldLabels: Record<PriceField, string> = {
  SELLING_PRICE: 'Harga Jual',
  COST_PRICE: 'Harga Modal',
}

const sourceLabels: Record<PriceSource, string> = {
  MANUAL: 'Manual',
  SCHEDULED: 'Terjadwal',
  BULK: 'Massal',
}

const load = async () => {
  await productsStore.fetchProduct(productId.value)
  await Promise.all([
    pricesStore.fetchHistory(productId.value),
    pricesStore.fetchSchedule(productId.value),
  ])
}

onMounted(load)

const submitSchedule = async () => {
  formError.value = ''

  const price = Number(form.selling_price)

  if (!Number.isFinite(price) || price < 0) {
    formError.value = 'Harga jual tidak valid.'
    return
  }

  if (!form.effective_date) {
    formError.value = 'Tanggal berlaku wajib diisi.'
    return
  }

  if (form.reason.trim().length < 3) {
    formError.value = 'Alasan minimal 3 karakter.'
    return
  }

  try {
    await pricesStore.saveSchedule(productId.value, {
      selling_price: price,
      effective_date: new Date(form.effective_date).toISOString(),
      reason: form.reason.trim(),
    })
    notify.success('Harga terjadwal disimpan')
    form.selling_price = ''
    form.effective_date = ''
    form.reason = ''
  } catch (error) {
    formError.value = errorMessage(error, 'Gagal menyimpan jadwal harga.')
  }
}

const cancelSchedule = async () => {
  const schedule = pricesStore.schedule
  if (!schedule) return

  try {
    await pricesStore.cancelSchedule(productId.value, schedule.id)
    notify.success('Jadwal harga dibatalkan')
  } catch (error) {
    notify.error(errorMessage(error, 'Gagal membatalkan jadwal.'))
  }
}
</script>

<template>
  <section class="space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-[28px] font-semibold tracking-tight text-ink">Manajemen Harga</h1>
        <p v-if="product" class="mt-1 text-sm text-ink-3">
          {{ product.name }} · {{ product.sku }} · Harga jual
          {{ formatRupiah(product.selling_price) }}
        </p>
      </div>
      <AppButton variant="secondary" @click="router.push('/products')">Kembali</AppButton>
    </header>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div class="rounded-xl border border-border bg-surface p-4">
        <p class="mb-3 text-sm font-medium text-ink-2">Riwayat Harga</p>

        <div v-if="pricesStore.isLoading" class="space-y-3">
          <SkeletonBlock v-for="index in 4" :key="index" height="2.5rem" />
        </div>

        <ErrorState v-else-if="pricesStore.error" :message="pricesStore.error" @retry="load" />

        <EmptyState
          v-else-if="pricesStore.history.length === 0"
          title="Belum ada riwayat"
          description="Perubahan harga jual atau harga modal akan tampil di sini."
        />

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-ink-3">
                <th scope="col" class="px-3 py-2 font-medium">Field</th>
                <th scope="col" class="px-3 py-2 font-medium">Perubahan</th>
                <th scope="col" class="px-3 py-2 font-medium">Sumber</th>
                <th scope="col" class="px-3 py-2 font-medium">Alasan</th>
                <th scope="col" class="px-3 py-2 font-medium">Oleh</th>
                <th scope="col" class="px-3 py-2 font-medium">Waktu</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="entry in pricesStore.history" :key="entry.id">
                <td class="px-3 py-2 text-ink-2">{{ fieldLabels[entry.field] }}</td>
                <td class="px-3 py-2 text-ink">
                  {{ formatRupiah(entry.old_value) }} → {{ formatRupiah(entry.new_value) }}
                </td>
                <td class="px-3 py-2">
                  <AppBadge tone="neutral">{{ sourceLabels[entry.source] }}</AppBadge>
                </td>
                <td class="px-3 py-2 text-ink-3">{{ entry.reason ?? '—' }}</td>
                <td class="px-3 py-2 text-ink-2">{{ entry.changed_by?.name ?? 'Sistem' }}</td>
                <td class="px-3 py-2 text-ink-3">{{ formatDateTime(entry.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="space-y-4 rounded-xl border border-border bg-surface p-4">
        <p class="text-sm font-medium text-ink-2">Harga Terjadwal</p>

        <div v-if="pricesStore.schedule" class="rounded-lg border border-accent/40 bg-accent-soft p-3">
          <p class="text-sm font-medium text-ink">
            {{ formatRupiah(pricesStore.schedule.selling_price) }}
          </p>
          <p class="mt-1 text-xs text-ink-3">
            Berlaku {{ formatDateTime(pricesStore.schedule.effective_date) }} ·
            {{ pricesStore.schedule.reason }}
          </p>
          <AppButton
            v-if="canWrite"
            variant="danger"
            size="sm"
            class="mt-2"
            :loading="pricesStore.isSaving"
            @click="cancelSchedule"
          >
            Batalkan Jadwal
          </AppButton>
        </div>

        <p v-else-if="!canWrite" class="text-sm text-ink-3">
          Tidak ada harga terjadwal.
        </p>

        <form v-else class="space-y-3" @submit.prevent="submitSchedule">
          <AppInput
            v-model="form.selling_price"
            label="Harga jual baru"
            type="number"
            inputmode="decimal"
            min="0"
          />
          <AppInput v-model="form.effective_date" label="Berlaku mulai" type="datetime-local" />
          <AppInput v-model="form.reason" label="Alasan" placeholder="Mis. penyesuaian harga bulan depan" />

          <p v-if="formError" class="text-sm text-negative">{{ formError }}</p>

          <AppButton type="submit" :loading="pricesStore.isSaving">Simpan Jadwal</AppButton>
        </form>
      </div>
    </div>
  </section>
</template>
