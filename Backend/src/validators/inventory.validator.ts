import { paginationSchema } from './common.validator.js'

export const listLowStockQuerySchema = paginationSchema

export type ListLowStockQuery = {
  page: number
  limit: number
}