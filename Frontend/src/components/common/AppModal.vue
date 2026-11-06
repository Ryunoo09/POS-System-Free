<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'

type MaxWidth = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    maxWidth?: MaxWidth
  }>(),
  {
    maxWidth: 'md',
  },
)

const emit = defineEmits<{ close: [] }>()
const panel = ref<HTMLElement | null>(null)

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

let previouslyFocused: HTMLElement | null = null

const maxWidthClass = computed(
  () =>
    ({
      sm: 'max-w-md',
      md: 'max-w-xl',
      lg: 'max-w-3xl',
    })[props.maxWidth],
)

const restoreBodyScroll = (): void => {
  document.body.style.overflow = ''
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      previouslyFocused = document.activeElement as HTMLElement | null
      document.body.style.overflow = 'hidden'
      await nextTick()
      panel.value?.focus()
      return
    }

    restoreBodyScroll()
    previouslyFocused?.focus()
    previouslyFocused = null
  },
)

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    emit('close')
    return
  }

  if (event.key !== 'Tab' || !panel.value) return

  const focusable = [...panel.value.querySelectorAll<HTMLElement>(FOCUSABLE)]
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (!first || !last) return

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

onUnmounted(restoreBodyScroll)
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4"
        @click.self="emit('close')"
        @keydown="onKeydown"
      >
        <section
          ref="panel"
          tabindex="-1"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          :class="[
            'w-full rounded-t-xl bg-surface shadow-xl outline-none sm:rounded-xl',
            maxWidthClass,
          ]"
        >
          <header class="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 class="text-lg font-semibold text-ink">{{ title }}</h2>
            <button
              type="button"
              class="rounded-md p-1 text-xl leading-none text-ink-3 hover:bg-surface-2 hover:text-ink"
              aria-label="Tutup"
              @click="emit('close')"
            >
              ×
            </button>
          </header>

          <div class="max-h-[70vh] overflow-y-auto px-5 py-4">
            <slot />
          </div>

          <footer
            v-if="$slots.footer"
            class="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3"
          >
            <slot name="footer" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 160ms ease-out;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active {
    transition: none;
  }
}
</style>