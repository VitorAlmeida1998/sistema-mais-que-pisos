import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Building2, Wrench, ClipboardList,
  Wallet, CreditCard, History, UserCog, ScrollText, LogOut, X, Sun, Moon
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useThemeStore } from '@/store/theme'
import { cn } from '@/lib/utils'
import type { Papel } from '@/types'

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  roles: Papel[]
}

const navItems: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'gestor', 'visualizador'] },
  { to: '/instaladores', icon: Users, label: 'Instaladores', roles: ['admin', 'gestor', 'visualizador'] },
  { to: '/obras', icon: Building2, label: 'Obras', roles: ['admin', 'gestor', 'visualizador'] },
  { to: '/servicos', icon: Wrench, label: 'Serviços', roles: ['admin'] },
  { to: '/atividades', icon: ClipboardList, label: 'Atividades', roles: ['admin', 'gestor', 'visualizador'] },
  { to: '/adiantamentos', icon: Wallet, label: 'Adiantamentos', roles: ['admin', 'gestor', 'visualizador'] },
  { to: '/fechamento', icon: CreditCard, label: 'Fechamento Semanal', roles: ['admin', 'gestor'] },
  { to: '/pagamentos', icon: History, label: 'Pagamentos', roles: ['admin', 'gestor', 'visualizador'] },
  { to: '/usuarios', icon: UserCog, label: 'Usuários', roles: ['admin'] },
  { to: '/audit-log', icon: ScrollText, label: 'Audit Log', roles: ['admin'] },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout, hasRole } = useAuth()
  const { isDark, toggle } = useThemeStore()

  return (
    <aside className={cn(
      'fixed left-0 top-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-screen transition-transform duration-200 ease-in-out',
      'lg:translate-x-0',
      isOpen ? 'translate-x-0' : '-translate-x-full'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
          <span className="text-white font-bold text-xs">MQ</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-900 dark:text-gray-100 leading-tight">Mais que Pisos</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Gestão de Pagamentos</p>
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 lg:hidden">
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-0.5">
          {navItems
            .filter((item) => hasRole(...item.roles))
            .map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                      isActive
                        ? 'bg-primary-light text-primary-dark dark:bg-primary/20 dark:text-red-300 font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                    )
                  }
                >
                  <item.icon size={16} />
                  {item.label}
                </NavLink>
              </li>
            ))}
        </ul>
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.nome}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.papel}</p>
          </div>
          <button
            onClick={toggle}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded"
            title={isDark ? 'Modo claro' : 'Modo escuro'}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={logout} className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
