import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { pagamentosApi } from '@/services/api'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function Pagamentos() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['pagamentos'],
    queryFn: () => pagamentosApi.list().then((r) => r.data),
  })

  const downloadRecibo = async (id: number) => {
    try {
      const res = await pagamentosApi.recibo(id)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `recibo_pagamento_${id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('PDF não disponível para este pagamento.')
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Histórico de Pagamentos</h1>
          <p className="text-sm text-gray-500">{data.length} registro(s)</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="table-header">
              <th className="px-4 py-3 text-left hidden sm:table-cell">#</th>
              <th className="px-4 py-3 text-left">Instalador</th>
              <th className="px-4 py-3 text-left">Período</th>
              <th className="px-4 py-3 text-right hidden sm:table-cell">Bruto</th>
              <th className="px-4 py-3 text-right hidden md:table-cell">Adiant.</th>
              <th className="px-4 py-3 text-right">Líquido</th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">Data Pag.</th>
              <th className="px-4 py-3 text-left">Recibo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Carregando...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Nenhum pagamento encontrado</td></tr>
            ) : (
              data.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">#{p.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{p.instalador_nome ?? `#${p.instalador_id}`}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(p.semana_inicio)} — {formatDate(p.semana_fim)}</td>
                  <td className="px-4 py-3 text-right dark:text-gray-300 hidden sm:table-cell">{formatCurrency(p.valor_bruto)}</td>
                  <td className="px-4 py-3 text-right text-warning hidden md:table-cell">{formatCurrency(p.valor_adiantamentos)}</td>
                  <td className="px-4 py-3 text-right font-bold text-success">{formatCurrency(p.valor_liquido)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{p.data_pagamento ? formatDate(p.data_pagamento) : '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => downloadRecibo(p.id)}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark font-medium"
                    >
                      <Download size={14} /> PDF
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
