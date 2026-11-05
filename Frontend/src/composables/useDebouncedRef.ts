import { onScopeDispose, shallowRef, watch, type Ref, type ShallowRef } from 'vue'

export const useDebouncedRef = <T>(source: Ref<T>, delay = 300): Readonly<ShallowRef<T>> => {
  const debounced = shallowRef(source.value)
  let timer: ReturnType<typeof setTimeout> | undefined

  watch(source, (value) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      debounced.value = value
    }, delay)
  })

  onScopeDispose(() => clearTimeout(timer), true)

  return debounced
}