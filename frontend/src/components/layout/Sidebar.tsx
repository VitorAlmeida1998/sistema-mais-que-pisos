import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Building2, Wrench, ClipboardList,
  Wallet, CreditCard, History, UserCog, ScrollText, LogOut
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const navItems = [
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

export function Sidebar() {
  const { user, logout, hasRole } = useAuth()

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
        <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
          <span className="text-white font-bold text-xs">MQ</span>
        </div>
        <div>
          <p className="font-bold text-sm text-gray-900 leading-tight">Mais que Pisos</p>
          <p className="text-xs text-gray-500">Gestão de Pagamentos</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-0.5">
          {navItems
            .filter((item) => hasRole(...(item.roles as Parameters<typeof hasRole>)))
            .map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                      isActive
                        ? 'bg-primary-light text-primary-dark font-medium'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.nome}</p>
            <p className="text-xs text-gray-500 truncate">{user?.papel}</p>
          </div>
          <button onClick={logout} className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
