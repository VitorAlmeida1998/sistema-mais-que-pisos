import { useAuthStore } from '@/store/auth'
import type { Papel } from '@/types'

export function useAuth() {
  const { user, accessToken, logout } = useAuthStore()

  const hasRole = (...roles: Papel[]) => {
    if (!user) return false
    return roles.includes(user.papel)
  }

  return {
    user,
    isAuthenticated: !!accessToken,
    isAdmin: hasRole('admin'),
    isGestor: hasRole('admin', 'gestor'),
    canWrite: hasRole('admin', 'gestor'),
    logout,
    hasRole,
  }
}
