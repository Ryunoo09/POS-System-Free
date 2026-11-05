<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppInput from '@/components/common/AppInput.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppTextarea from '@/components/common/AppTextarea.vue'
import type { Category, CategoryFormValues } from '@/types/category'

const props = withDefaults(
  defineProps<{
    open: boolean
    category?: Category | null
    loading?: boolean
    fieldErrors?: Record<string, string>
    formError?: string
  }>(),
  {
    category: null,
    loading: false,
    fieldErrors: () => ({}),
    formError: '',
  },
)

const emit = defineEmits<{ close: []; submit: [values: CategoryFormValues] }>()

const isUpdate = computed(() => Boolean(props.category))
const title = computed(() => (isUpdate.value ? 'Ubah Kategori' : 'Tambah Kategori'))

const form = reactive<CategoryFormValues>({ name: '', description: '' })
const localErrors = ref<Record<string, string>>({})

const resetForm = () => {
  form.name = props.category?.name ?? ''
  form.description = props.category?.description ?? ''
  localErrors.value = {}
}

watch(
  () => props.open,
  (open) => {
    if (open) resetForm()
  },
  { immediate: true },
)

const fieldError = (field: string): string => localErrors.value[field] ?? props.fieldErrors[field] ?? ''

const submit = () => {
  const errors: Record<string, string> = {}
  const name = form.name.trim()

  if (!name) {
    errors.name = 'Nama kategori wajib diisi'
  } else if (name.length > 100) {
    errors.name = 'Nama kategori maksimal 100 karakter'
  }

  if (form.description.trim().length > 500) {
    errors.description = 'Deskripsi maksimal 500 karakter'
  }

  localErrors.value = errors

  if (Object.keys(errors).length > 0) return

  emit('submit', { name, description: form.description.trim() })
}
</script>

<template>
  <AppModal :open="open" :title="title" @close="emit('close')">
    <form id="category-form" class="space-y-4" novalidate @submit.prevent="submit">
      <div
        v-if="formError"
        class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
        role="alert"
      >
        {{ formError }}
      </div>

      <AppInput
        v-model="form.name"
        label="Nama kategori"
        placeholder="Contoh: Minuman"
        :error="fieldError('name')"
        required
      />

      <AppTextarea
        v-model="form.description"
        label="Deskripsi"
        placeholder="Opsional"
        :maxlength="500"
        :error="fieldError('description')"
      />
    </form>

    <template #footer>
      <AppButton variant="secondary" :disabled="loading" @click="emit('close')">Batal</AppButton>
      <AppButton type="submit" form="category-form" :loading="loading">Simpan</AppButton>
    </template>
  </AppModal>
</template>