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

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_URL?: string
    readonly VITE_TAX_RATE?: string
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}
