import { useQuery } from '@tanstack/react-query'
import { Users, Building2, ClipboardList, TrendingUp } from 'lucide-react'
import { dashboardApi } from '@/services/api'
import { formatCurrency } from '@/lib/utils'

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.get().then((r) => r.data),
  })

  const cards = [
    {
      label: 'Instaladores Ativos',
      value: data?.instaladores_ativos ?? 0,
      icon: Users,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Obras em Andamento',
      value: data?.obras_em_andamento ?? 0,
      icon: Building2,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      label: 'Atividades Pendentes',
      value: data?.atividades_pendentes_aprovacao ?? 0,
      icon: ClipboardList,
      color: 'text-warning bg-yellow-50',
    },
    {
      label: 'Valor Previsto Pagamento',
      value: formatCurrency(data?.valor_previsto_pagamento ?? 0),
      icon: TrendingUp,
      color: 'text-success bg-green-50',
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div key={card.label} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500">{card.label}</p>
                <div className={`p-2 rounded-lg ${card.color}`}>
                  <card.icon size={18} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
