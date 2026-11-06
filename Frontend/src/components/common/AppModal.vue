<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

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

const maxWidthClass = computed(
  () =>
    ({
      sm: 'max-w-md',
      md: 'max-w-xl',
      lg: 'max-w-3xl',
    })[props.maxWidth],
)

watch(
  () => props.open,
  async (open) => {
    if (!open) return

    await nextTick()
    panel.value?.focus()
  },
)
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4"
        @click.self="emit('close')"
        @keydown.esc="emit('close')"
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
</style>