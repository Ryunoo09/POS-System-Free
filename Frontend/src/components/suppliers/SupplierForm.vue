<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppTextarea from '@/components/common/AppTextarea.vue'
import type { Supplier, SupplierFormValues } from '@/types/supplier'

const props = withDefaults(
  defineProps<{
    open: boolean
    supplier?: Supplier | null
    loading?: boolean
    fieldErrors?: Record<string, string>
    formError?: string
  }>(),
  {
    supplier: null,
    loading: false,
    fieldErrors: () => ({}),
    formError: '',
  },
)

const emit = defineEmits<{ close: []; submit: [values: SupplierFormValues] }>()

const isUpdate = computed(() => Boolean(props.supplier))
const title = computed(() => (isUpdate.value ? 'Ubah Supplier' : 'Tambah Supplier'))

const form = reactive<SupplierFormValues>({
  name: '',
  contact: '',
  phone: '',
  email: '',
  address: '',
})
const localErrors = ref<Record<string, string>>({})

const resetForm = () => {
  form.name = props.supplier?.name ?? ''
  form.contact = props.supplier?.contact ?? ''
  form.phone = props.supplier?.phone ?? ''
  form.email = props.supplier?.email ?? ''
  form.address = props.supplier?.address ?? ''
  localErrors.value = {}
}

watch(
  () => props.open,
  (open) => {
    if (open) resetForm()
  },
  { immediate: true },
)

const fieldError = (field: string): string =>
  localErrors.value[field] ?? props.fieldErrors[field] ?? ''

const submit = () => {
  const errors: Record<string, string> = {}
  const name = form.name.trim()

  if (!name) {
    errors.name = 'Nama supplier wajib diisi'
  } else if (name.length > 150) {
    errors.name = 'Nama supplier maksimal 150 karakter'
  }

  if (form.contact.trim().length > 100) errors.contact = 'Kontak maksimal 100 karakter'
  if (form.phone.trim().length > 30) errors.phone = 'Telepon maksimal 30 karakter'
  if (form.address.trim().length > 255) errors.address = 'Alamat maksimal 255 karakter'

  const email = form.email.trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Format email tidak valid'
  }

  localErrors.value = errors

  if (Object.keys(errors).length > 0) return

  emit('submit', {
    name,
    contact: form.contact.trim(),
    phone: form.phone.trim(),
    email: email,
    address: form.address.trim(),
  })
}
</script>

<template>
  <AppModal :open="open" :title="title" @close="emit('close')">
    <form id="supplier-form" class="space-y-4" novalidate @submit.prevent="submit">
      <div
        v-if="formError"
        class="rounded-lg border border-negative bg-negative-soft px-3 py-2 text-sm text-negative"
        role="alert"
      >
        {{ formError }}
      </div>

      <AppInput
        v-model="form.name"
        label="Nama supplier"
        placeholder="Contoh: PT Sumber Kopi"
        :error="fieldError('name')"
        required
      />

      <div class="grid gap-4 sm:grid-cols-2">
        <AppInput
          v-model="form.contact"
          label="Nama kontak"
          placeholder="Opsional"
          :error="fieldError('contact')"
        />
        <AppInput
          v-model="form.phone"
          label="Telepon"
          placeholder="Opsional"
          inputmode="tel"
          :error="fieldError('phone')"
        />
      </div>

      <AppInput
        v-model="form.email"
        label="Email"
        type="email"
        placeholder="Opsional"
        :error="fieldError('email')"
      />

      <AppTextarea
        v-model="form.address"
        label="Alamat"
        placeholder="Opsional"
        :maxlength="255"
        :error="fieldError('address')"
      />
    </form>

    <template #footer>
      <AppButton variant="secondary" :disabled="loading" @click="emit('close')">Batal</AppButton>
      <AppButton type="submit" form="supplier-form" :loading="loading">Simpan</AppButton>
    </template>
  </AppModal>
</template>