import { storeToRefs } from 'pinia'
import { useCartStore } from '@/stores/cart.store'

export const useCart = () => {
  const cart = useCartStore()

  return {
    cart,
    ...storeToRefs(cart),
  }
}
