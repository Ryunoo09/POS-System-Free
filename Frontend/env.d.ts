/// <reference types="vite/client" />

export {}

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    requiresAuth?: boolean
    permissions?: string[]
    title?: string
  }
}
