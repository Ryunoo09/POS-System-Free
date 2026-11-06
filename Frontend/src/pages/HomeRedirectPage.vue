<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const router = useRouter()

onMounted(() => {
  void router.replace(auth.user?.role === 'CASHIER' ? '/pos' : '/dashboard')
})
</script>

<template>
  <div class="p-6 text-sm text-ink-3">Mengalihkan...</div>
</template>
