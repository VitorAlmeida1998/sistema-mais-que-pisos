import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, Building2, ClipboardList, TrendingUp, Trophy } from 'lucide-react'
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

const KPI_CARDS = [
  {
    key: 'instaladores_ativos' as const,
    label: 'Instaladores Ativos',
    icon: Users,
    gradient: 'from-blue-500 to-blue-600',
    iconBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    iconColor: 'text-blue-500',
    border: 'border-t-blue-500',
  },
  {
    key: 'obras_em_andamento' as const,
    label: 'Obras em Andamento',
    icon: Building2,
    gradient: 'from-violet-500 to-violet-600',
    iconBg: 'bg-violet-500/10 dark:bg-violet-500/20',
    iconColor: 'text-violet-500',
    border: 'border-t-violet-500',
  },
  {
    key: 'atividades_pendentes_aprovacao' as const,
    label: 'Atividades Pendentes',
    icon: ClipboardList,
    gradient: 'from-amber-500 to-amber-600',
    iconBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    iconColor: 'text-amber-500',
    border: 'border-t-amber-500',
  },
  {
    key: 'valor_previsto_pagamento' as const,
    label: 'Valor Previsto',
    icon: TrendingUp,
    gradient: 'from-emerald-500 to-emerald-600',
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    iconColor: 'text-emerald-500',
    border: 'border-t-emerald-500',
  },
]

function ChartTooltip({ active, payload, label, formatter = String }: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
  formatter?: (value: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-card p-4 text-sm">
      <p className="font-bold text-gray-700 dark:text-gray-200 mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="leading-6 font-medium">
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

  const { data: ranking = [] } = useQuery({
    queryKey: ['dashboard-ranking'],
    queryFn: () => dashboardApi.ranking().then((r) => r.data),
  })

  const chartData = mensal.map((item) => ({
    label: item.label,
    'Valor Pago': parseFloat(item.valor_pago),
    'Adiantamentos': parseFloat(item.valor_adiantamentos),
    'Pagamentos': item.qtd_pagamentos,
  }))

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Visão geral do sistema</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading
          ? [...Array(4)].map((_, i) => (
              <div key={i} className="card p-6 animate-pulse h-32" />
            ))
          : KPI_CARDS.map((card) => {
              const rawValue = data?.[card.key] ?? 0
              const displayValue =
                card.key === 'valor_previsto_pagamento'
                  ? formatCurrency(rawValue)
                  : rawValue

              return (
                <div
                  key={card.label}
                  className={`card p-6 border-t-[3px] ${card.border} hover:shadow-card-hover transition-shadow duration-300`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-2xl ${card.iconBg}`}>
                      <card.icon size={20} className={card.iconColor} />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {displayValue}
                  </p>
                  <p className="text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    {card.label}
                  </p>
                </div>
              )
            })}
      </div>

      {/* Gráfico de valores */}
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Pagamentos Mensais</h2>
            <p className="text-xs text-gray-400 mt-0.5">Valor líquido pago e adiantamentos por mês</p>
          </div>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700/60 rounded-xl p-1">
            {MESES_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMeses(opt.value)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  meses === opt.value
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loadingMensal ? (
          <div className="h-64 animate-pulse bg-gray-100 dark:bg-gray-700/40 rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barGap={4} barCategoryGap="32%">
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-gray-700/50" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: 'currentColor' }}
                className="text-gray-400"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={fmtYAxis}
                tick={{ fontSize: 11, fill: 'currentColor' }}
                className="text-gray-400"
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip content={<ChartTooltip formatter={formatCurrency} />} cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 8 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
              <Bar dataKey="Valor Pago" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={48} />
              <Bar dataKey="Adiantamentos" fill="#F59E0B" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Gráfico de quantidade */}
      <div className="card p-6">
        <div className="mb-6">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Fechamentos Realizados</h2>
          <p className="text-xs text-gray-400 mt-0.5">Quantidade de pagamentos efetuados por mês</p>
        </div>

        {loadingMensal ? (
          <div className="h-48 animate-pulse bg-gray-100 dark:bg-gray-700/40 rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barCategoryGap="45%">
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-gray-700/50" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: 'currentColor' }}
                className="text-gray-400"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: 'currentColor' }}
                className="text-gray-400"
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)', radius: 8 }} />
              <Bar dataKey="Pagamentos" fill="#DC2626" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Ranking de instaladores */}
      {ranking.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={18} className="text-amber-500" />
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Top Instaladores</h2>
            <span className="text-xs text-gray-400 ml-1">por valor total recebido</span>
          </div>
          <div className="space-y-3">
            {ranking.map((item, index) => {
              const max = parseFloat(ranking[0].total_liquido)
              const pct = max > 0 ? (parseFloat(item.total_liquido) / max) * 100 : 0
              const medals = ['🥇', '🥈', '🥉']
              return (
                <div key={item.instalador_id} className="flex items-center gap-3">
                  <span className="text-lg w-6 text-center">{medals[index] ?? `${index + 1}º`}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.instalador_nome}</span>
                      <span className="text-sm font-bold text-emerald-600 ml-2 flex-shrink-0">{formatCurrency(item.total_liquido)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{item.qtd_pagamentos} fechamento(s)</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
