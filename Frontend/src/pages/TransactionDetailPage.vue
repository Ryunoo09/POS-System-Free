<script setup lang="ts">
import { useRoute } from 'vue-router'
import PagePlaceholder from '@/components/common/PagePlaceholder.vue'

const route = useRoute()
const transactionId = String(route.params.id ?? '')
</script>

<template>
  <PagePlaceholder
    title="Detail Transaksi"
    :description="`Detail transaksi ${transactionId} akan ditampilkan di sini.`"
    phase="F5"
  />
</template>
