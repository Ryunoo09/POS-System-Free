import { http } from './api'
import type { ListResult } from '@/types/api'
import type { User, UserCreatePayload, UserListParams, UserUpdatePayload } from '@/types/user'

export const usersService = {
  async list(params: UserListParams): Promise<ListResult<User>> {
    return http.getList<User>('/users', { params })
  },

  async create(payload: UserCreatePayload): Promise<User> {
    const response = await http.post<User>('/users', payload)
    return response.data
  },

  async update(id: string, payload: UserUpdatePayload): Promise<User> {
    const response = await http.put<User>(`/users/${id}`, payload)
    return response.data
  },
}