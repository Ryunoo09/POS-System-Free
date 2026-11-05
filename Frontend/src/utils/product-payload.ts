import type { ProductCreatePayload, ProductFormValues, ProductUpdatePayload } from '@/types/product'

type ProductBasePayload = Omit<ProductCreatePayload, 'stock' | 'barcode'>

const trimDescription = (value: string): string | undefined => {
  const description = value.trim()
  return description || undefined
}

const toBasePayload = (values: ProductFormValues): ProductBasePayload => ({
  sku: values.sku.trim().toUpperCase(),
  name: values.name.trim(),
  description: trimDescription(values.description),
  category_id: values.category_id,
  unit: values.unit.trim(),
  cost_price: values.cost_price,
  selling_price: values.selling_price,
  min_stock: values.min_stock,
})

export const toProductCreatePayload = (values: ProductFormValues): ProductCreatePayload => {
  const barcode = values.barcode.trim()

  return {
    ...toBasePayload(values),
    ...(barcode ? { barcode } : {}),
    stock: values.stock,
  }
}

export const toProductUpdatePayload = (values: ProductFormValues): ProductUpdatePayload =>
  toBasePayload(values)