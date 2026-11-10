<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import JsBarcode from 'jsbarcode'
import { barcodeFormat } from '@/utils/barcode'

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

const render = () => {
  if (!svg.value || !props.value) return

  try {
    JsBarcode(svg.value, props.value, {
      format: barcodeFormat(props.value),
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