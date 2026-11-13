import { ConflictError, NotFoundError } from '../errors/app-errors.js'
import type { CacheService } from '../cache/cache.service.js'
import { toCategoryDto, type CategoryDto } from '../mappers/category.mapper.js'
import type { CategoryRepository } from '../repositories/category.repository.js'
import type { PaginationMeta } from '../types/http.js'
import { buildPaginationMeta, toSkip } from '../utils/pagination.js'
import type {
  CreateCategoryInput,
  ListCategoriesQuery,
  UpdateCategoryInput,
} from '../validators/category.validator.js'

export interface CategoryActor {
  /** Admin/Owner dapat melihat kategori nonaktif; Cashier hanya yang aktif. */
  canViewAll: boolean
}


export interface CategoryService {
  list: (
    query: ListCategoriesQuery,
    actor: CategoryActor,
  ) => Promise<{ items: CategoryDto[]; meta: PaginationMeta }>
  create: (input: CreateCategoryInput) => Promise<CategoryDto>
  update: (id: string, input: UpdateCategoryInput) => Promise<CategoryDto>
  remove: (id: string) => Promise<CategoryDto>
}

export const createCategoryService = ({
  categoryRepository,
  cache,
}: {
  categoryRepository: CategoryRepository
  cache?: CacheService
}): CategoryService => {
  const assertNameAvailable = async (name: string, excludeId?: string): Promise<void> => {
    const existing = await categoryRepository.findByName(name, excludeId)

    if (existing) {
      throw new ConflictError('Nama kategori sudah digunakan', 'DUPLICATE_CATEGORY', [
        { field: 'name', message: 'Nama kategori sudah digunakan' },
      ])
    }
  }

  const findOrFail = async (id: string) => {
    const category = await categoryRepository.findById(id)

    if (!category) {
      throw new NotFoundError('Kategori tidak ditemukan', 'NOT_FOUND')
    }

    return category
  }

  return {
    list: async (query, actor) => {
      const isActive = actor.canViewAll ? query.is_active : true

      const { items, total } = await categoryRepository.list({
        skip: toSkip(query.page, query.limit),
        take: query.limit,
        search: query.search,
        isActive,
      })

      return {
        items: items.map(toCategoryDto),
        meta: buildPaginationMeta(query.page, query.limit, total),
      }
    },

    create: async (input) => {
      await assertNameAvailable(input.name)

      const created = await categoryRepository.create({
        name: input.name,
        description: input.description ?? null,
      })

      await cache?.bumpVersion('categories')

      return toCategoryDto(created)
    },

    update: async (id, input) => {
      const existing = await findOrFail(id)

      if (input.name !== undefined && input.name !== existing.name) {
        await assertNameAvailable(input.name, id)
      }

      const updated = await categoryRepository.update(id, {
        name: input.name,
        description: input.description,
        isActive: input.is_active,
      })

      // Nama kategori ikut tersimpan di DTO produk, jadi cache produk juga diinvalidasi.
      await cache?.bumpVersion('categories')
      await cache?.bumpVersion('products')

      return toCategoryDto(updated)
    },

    remove: async (id) => {
      await findOrFail(id)

      const productCount = await categoryRepository.countProducts(id)

      if (productCount > 0) {
        throw new ConflictError(
          `Kategori masih dipakai ${productCount} produk. Nonaktifkan sebagai gantinya.`,
          'CATEGORY_IN_USE',
          [{ field: 'id', message: `Kategori masih dipakai ${productCount} produk` }],
        )
      }

      const deleted = await categoryRepository.delete(id)

      await cache?.bumpVersion('categories')

      return toCategoryDto({ ...deleted, _count: { products: 0 } })
    },
  }
}
