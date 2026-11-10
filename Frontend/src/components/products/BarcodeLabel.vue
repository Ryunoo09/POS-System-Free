<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import JsBarcode from 'jsbarcode'

const props = withDefaults(
  defineProps<{
    value: string
    width?: number
    height?: number
  }>(),
  {
    width: 2,
    height: 48,
  },
)

const svg = ref<SVGSVGElement | null>(null)

const formatFor = (value: string): string => {
  if (/^\d{13}$/.test(value)) return 'EAN13'
  if (/^\d{12}$/.test(value)) return 'UPC'
  if (/^\d{8}$/.test(value)) return 'EAN8'
  return 'CODE128'
}

const render = () => {
  if (!svg.value || !props.value) return

  try {
    JsBarcode(svg.value, props.value, {
      format: formatFor(props.value),
      width: props.width,
      height: props.height,
      displayValue: true,
      fontSize: 12,
      margin: 0,
    })
  } catch {
    svg.value.innerHTML = ''
  }
}

onMounted(render)
watch(() => [props.value, props.width, props.height], render)
</script>

<template>
  <svg ref="svg" class="max-w-full" />
</template>