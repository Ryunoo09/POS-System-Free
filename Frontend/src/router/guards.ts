import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import type { Role } from '@/types/auth'
import { ApiError } from '@/utils/api-error'
import { hasAnyPermission } from '@/utils/permissions'

const homeFor = (role?: Role): string => (role === 'CASHIER' ? '/pos' : '/dashboard')

const isUnauthorized = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 401

export const installGuards = (router: Router): void => {
  router.beforeEach(async (to) => {
    const auth = useAuthStore()

    if (to.meta.public) {
      if (to.name === 'login' && auth.token && to.query.sessionError !== '1') {
        if (!auth.user) {
          try {
            await auth.fetchMe()
          } catch (error) {
            if (isUnauthorized(error)) {
              auth.logout()
            }

            return true
          }
        }

        if (auth.user) {
          return homeFor(auth.user.role)
        }
      }

      return true
    }

    if (!auth.token) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }

    if (!auth.user) {
      try {
        await auth.fetchMe()
      } catch (error) {
        if (isUnauthorized(error)) {
          auth.logout()
          return { name: 'login', query: { redirect: to.fullPath } }
        }

        return {
          name: 'login',
          query: { redirect: to.fullPath, sessionError: '1' },
        }
      }
    }

    if (to.name === 'home') {
      return homeFor(auth.user?.role)
    }

    const required = to.meta.permissions

    if (required?.length && !hasAnyPermission(auth.permissions, required)) {
      return { name: 'forbidden' }
    }

    return true
  })
}
