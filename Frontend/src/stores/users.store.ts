import { ref } from 'vue'
import { defineStore } from 'pinia'
import { usersService } from '@/services/users.service'
import type { PaginationMeta } from '@/types/api'
import type { User, UserCreatePayload, UserListParams, UserUpdatePayload } from '@/types/user'
import { errorMessage } from '@/utils/errors'
import { emptyPaginationMeta } from '@/utils/pagination'

export const useUsersStore = defineStore('users', () => {
  const items = ref<User[]>([])
  const meta = ref<PaginationMeta>(emptyPaginationMeta())
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref('')

  const fetchUsers = async (params: UserListParams): Promise<void> => {
    isLoading.value = true
    error.value = ''

    try {
      const result = await usersService.list(params)
      items.value = result.items
      meta.value = result.meta
    } catch (err) {
      error.value = errorMessage(err, 'Gagal memuat pengguna.')
    } finally {
      isLoading.value = false
    }
  }

  const createUser = async (payload: UserCreatePayload): Promise<User> => {
    isSaving.value = true

    try {
      return await usersService.create(payload)
    } finally {
      isSaving.value = false
    }
  }

  const updateUser = async (id: string, payload: UserUpdatePayload): Promise<User> => {
    isSaving.value = true

    try {
      return await usersService.update(id, payload)
    } finally {
      isSaving.value = false
    }
  }

  return { items, meta, isLoading, isSaving, error, fetchUsers, createUser, updateUser }
})