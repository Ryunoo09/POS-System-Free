import type { SupplierView } from '../repositories/supplier.repository.js'

export interface SupplierDto {
  id: string
  name: string
  contact: string | null
  phone: string | null
  email: string | null
  address: string | null
  is_active: boolean
  purchase_order_count: number
  created_at: string
  updated_at: string
}

export const toSupplierDto = (view: SupplierView): SupplierDto => ({
  id: view.id,
  name: view.name,
  contact: view.contact,
  phone: view.phone,
  email: view.email,
  address: view.address,
  is_active: view.isActive,
  purchase_order_count: view._count.purchaseOrders,
  created_at: view.createdAt.toISOString(),
  updated_at: view.updatedAt.toISOString(),
})