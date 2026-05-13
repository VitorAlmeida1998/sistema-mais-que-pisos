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

function UserAvatar({ nome }: { nome: string }) {
  const initials = nome.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 ring-1 ring-white/30">
      <span className="text-white text-xs font-bold">{initials}</span>
    </div>
  )
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout, hasRole } = useAuth()
  const { isDark, toggle } = useThemeStore()

  return (
    <aside className={cn(
      'fixed left-0 top-0 z-50 w-64 flex flex-col h-screen transition-transform duration-200 ease-in-out',
      'bg-[#B91C1C] border-r border-black/10',
      'lg:translate-x-0',
      isOpen ? 'translate-x-0' : '-translate-x-full'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-black/10">
        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-white/30">
          <span className="text-white font-bold text-xs">MQ</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white leading-tight">Mais que Pisos</p>
          <p className="text-[11px] text-red-200/70">Gestão de Pagamentos</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-white/50 hover:text-white lg:hidden rounded-lg hover:bg-black/10 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5 scrollbar-none">
        <p className="text-[10px] font-bold text-red-200/50 uppercase tracking-widest px-3 mb-3">
          Navegação
        </p>
        {navItems
          .filter((item) => hasRole(...item.roles))
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150',
                  isActive
                    ? 'bg-black/20 text-white font-semibold'
                    : 'text-red-100/80 hover:bg-black/10 hover:text-white'
                )
              }
            >
              <item.icon size={16} className="flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-black/10">
        <div className="flex items-center gap-3">
          {user && <UserAvatar nome={user.nome} />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.nome}</p>
            <p className="text-[11px] text-red-200/70 truncate capitalize">{user?.papel}</p>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={toggle}
              className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-black/10 transition-colors"
              title={isDark ? 'Modo claro' : 'Modo escuro'}
            >
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button
              onClick={logout}
              className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-black/10 transition-colors"
              title="Sair"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
