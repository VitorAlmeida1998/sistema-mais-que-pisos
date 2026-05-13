import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, Building2, ClipboardList, TrendingUp } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import { dashboardApi } from '@/services/api'
import { formatCurrency } from '@/lib/utils'

const MESES_OPTIONS = [
  { label: '3 meses', value: 3 },
  { label: '6 meses', value: 6 },
  { label: '12 meses', value: 12 },
]

function ChartTooltip({ active, payload, label, formatter = String }: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
  formatter?: (value: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="leading-5">
          {p.name}: {formatter(p.value)}
        </p>
      ))}
    </div>
  )
}

function fmtYAxis(v: number) {
  if (v >= 1000) return `R$${(v / 1000).toFixed(0)}k`
  return `R$${v}`
}

export default function Dashboard() {
  const [meses, setMeses] = useState(6)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.get().then((r) => r.data),
  })

  const { data: mensal = [], isLoading: loadingMensal } = useQuery({
    queryKey: ['dashboard-mensal', meses],
    queryFn: () => dashboardApi.mensal(meses).then((r) => r.data),
  })

  const chartData = mensal.map((item) => ({
    label: item.label,
    'Valor Pago': parseFloat(item.valor_pago),
    'Adiantamentos': parseFloat(item.valor_adiantamentos),
    'Pagamentos': item.qtd_pagamentos,
  }))

  const cards = [
    {
      label: 'Instaladores Ativos',
      value: data?.instaladores_ativos ?? 0,
      icon: Users,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
    },
    {
      label: 'Obras em Andamento',
      value: data?.obras_em_andamento ?? 0,
      icon: Building2,
      color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30',
    },
    {
      label: 'Atividades Pendentes',
      value: data?.atividades_pendentes_aprovacao ?? 0,
      icon: ClipboardList,
      color: 'text-warning bg-yellow-50 dark:bg-yellow-900/30',
    },
    {
      label: 'Valor Previsto Pagamento',
      value: formatCurrency(data?.valor_previsto_pagamento ?? 0),
      icon: TrendingUp,
      color: 'text-success bg-green-50 dark:bg-green-900/30',
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>

      {/* KPI cards */}
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
                <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                <div className={`p-2 rounded-lg ${card.color}`}>
                  <card.icon size={18} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Gráficos mensais */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Pagamentos Mensais</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Valor líquido pago e adiantamentos por mês</p>
          </div>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-md p-0.5">
            {MESES_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMeses(opt.value)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  meses === opt.value
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loadingMensal ? (
          <div className="h-64 animate-pulse bg-gray-100 dark:bg-gray-700 rounded-md" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barGap={4} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: 'currentColor' }}
                className="text-gray-500 dark:text-gray-400"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={fmtYAxis}
                tick={{ fontSize: 11, fill: 'currentColor' }}
                className="text-gray-500 dark:text-gray-400"
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip content={<ChartTooltip formatter={formatCurrency} />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
              />
              <Bar dataKey="Valor Pago" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Adiantamentos" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Gráfico de quantidade */}
      <div className="card p-5">
        <div className="mb-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Pagamentos Realizados</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Quantidade de fechamentos por mês</p>
        </div>

        {loadingMensal ? (
          <div className="h-48 animate-pulse bg-gray-100 dark:bg-gray-700 rounded-md" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barCategoryGap="40%">
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: 'currentColor' }}
                className="text-gray-500 dark:text-gray-400"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: 'currentColor' }}
                className="text-gray-500 dark:text-gray-400"
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="Pagamentos" fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
