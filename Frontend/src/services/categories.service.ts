import { http } from './api'
import type { ListResult } from '@/types/api'
import type {
  Category,
  CategoryCreatePayload,
  CategoryListParams,
  CategoryUpdatePayload,
} from '@/types/category'

export const categoriesService = {
  async list(params: CategoryListParams): Promise<ListResult<Category>> {
    return http.getList<Category>('/categories', { params })
  },

  async create(payload: CategoryCreatePayload): Promise<Category> {
    const response = await http.post<Category>('/categories', payload)
    return response.data
  },

  async update(id: string, payload: CategoryUpdatePayload): Promise<Category> {
    const response = await http.put<Category>(`/categories/${id}`, payload)
    return response.data
  },

  async remove(id: string): Promise<Category> {
    const response = await http.delete<Category>(`/categories/${id}`)
    return response.data
  },
}