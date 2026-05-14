import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, History, X, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'
import { pagamentosApi } from '@/services/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { exportToExcel } from '@/lib/excel'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'
import type { Atividade, Pagamento } from '@/types'

function AtividadesModal({ pagamento, onClose }: { pagamento: Pagamento; onClose: () => void }) {
  const { data: atividades = [], isLoading } = useQuery({
    queryKey: ['pagamento-atividades', pagamento.id],
    queryFn: () => pagamentosApi.atividades(pagamento.id).then((r) => r.data),
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Atividades — Pag. #{pagamento.id}</h2>
            <p className="text-sm text-gray-500">
              {pagamento.instalador_nome} · {formatDate(pagamento.semana_inicio)} a {formatDate(pagamento.semana_fim)}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm min-w-[480px]">
            <thead className="sticky top-0">
              <tr className="table-header">
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Obra</th>
                <th className="px-4 py-3 text-left">Serviço</th>
                <th className="px-4 py-3 text-right">Qtd</th>
                <th className="px-4 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {isLoading ? (
                <TableSkeleton cols={5} rows={4} />
              ) : atividades.length === 0 ? (
                <EmptyState icon={ClipboardList} title="Nenhuma atividade neste pagamento" />
              ) : (
                (atividades as Atividade[]).map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(a.data_execucao)}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.obra_cliente ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.servico_descricao ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                      {a.quantidade} {a.servico_unidade ?? ''}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-success">{formatCurrency(a.valor_calculado)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t dark:border-gray-700 flex items-center justify-between shrink-0">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Líquido: <span className="font-bold text-success">{formatCurrency(pagamento.valor_liquido)}</span>
          </p>
          <button onClick={onClose} className="btn-secondary">Fechar</button>
        </div>
      </div>
    </div>
  )
}

export default function Pagamentos() {
  const [selected, setSelected] = useState<Pagamento | null>(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['pagamentos'],
    queryFn: () => pagamentosApi.list().then((r) => r.data),
  })

  const { page, setPage, paginated, total } = usePagination(data, 20)

  const downloadRecibo = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await pagamentosApi.recibo(id)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `recibo_pagamento_${id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('PDF não disponível para este pagamento.')
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Histórico de Pagamentos</h1>
          <p className="text-sm text-gray-500">{total} registro(s)</p>
        </div>
        {data.length > 0 && (
          <button
            onClick={() => exportToExcel(
              data.map((p) => ({
                '#': p.id,
                Instalador: p.instalador_nome ?? '',
                'Período Início': p.semana_inicio,
                'Período Fim': p.semana_fim,
                'Valor Bruto': p.valor_bruto,
                Adiantamentos: p.valor_adiantamentos,
                'Valor Líquido': p.valor_liquido,
                'Data Pagamento': p.data_pagamento ?? '',
              })),
              'historico_pagamentos'
            )}
            className="btn-secondary flex items-center gap-2"
          >
            <Download size={15} /> Exportar Excel
          </button>
        )}
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
                <TableSkeleton cols={8} />
              ) : data.length === 0 ? (
                <EmptyState icon={History} title="Nenhum pagamento efetuado" description="Os fechamentos semanais confirmados aparecem aqui." />
              ) : (
                paginated.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                    title="Clique para ver atividades"
                  >
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">#{p.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{p.instalador_nome ?? `#${p.instalador_id}`}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(p.semana_inicio)} — {formatDate(p.semana_fim)}</td>
                    <td className="px-4 py-3 text-right dark:text-gray-300 hidden sm:table-cell">{formatCurrency(p.valor_bruto)}</td>
                    <td className="px-4 py-3 text-right text-warning hidden md:table-cell">{formatCurrency(p.valor_adiantamentos)}</td>
                    <td className="px-4 py-3 text-right font-bold text-success">{formatCurrency(p.valor_liquido)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{p.data_pagamento ? formatDate(p.data_pagamento) : '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => downloadRecibo(p.id, e)}
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
        <Pagination page={page} total={total} pageSize={20} onChange={setPage} />
      </div>

      {selected && <AtividadesModal pagamento={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
