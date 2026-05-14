import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, Printer, Download } from 'lucide-react'
import { instaladoresApi, relatoriosApi } from '@/services/api'
import { formatCurrency, formatDate, formatQuantidade, STATUS_ATIVIDADE_LABELS, UNIDADE_LABELS } from '@/lib/utils'
import { exportToExcel } from '@/lib/excel'

export default function Relatorios() {
  const [instaladorId, setInstaladorId] = useState<number | ''>('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [buscou, setBuscou] = useState(false)

  const { data: instaladores = [] } = useQuery({
    queryKey: ['instaladores', false],
    queryFn: () => instaladoresApi.list({ apenas_ativos: false }).then((r) => r.data),
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['relatorio-instalador', instaladorId, dataInicio, dataFim],
    queryFn: () =>
      relatoriosApi.instalador(Number(instaladorId), {
        data_inicio: dataInicio || undefined,
        data_fim: dataFim || undefined,
      }).then((r) => r.data),
    enabled: false,
  })

  function buscar() {
    if (!instaladorId) return
    setBuscou(true)
    refetch()
  }

  function imprimir() {
    window.print()
  }

  const statusBadge: Record<string, string> = {
    pendente: 'badge-pendente',
    aprovada: 'badge-aprovada',
    paga: 'badge-paga',
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Relatório por Instalador</h1>
          <p className="text-sm text-gray-500">Histórico completo de atividades e pagamentos</p>
        </div>
        {data && (
          <div className="flex gap-2">
            <button
              onClick={() => exportToExcel(
                data.atividades.map((a) => ({
                  Data: a.data_execucao,
                  Obra: a.obra_cliente ?? '',
                  Serviço: a.servico_descricao ?? '',
                  Quantidade: formatQuantidade(a.quantidade),
                  Unidade: a.servico_unidade ? UNIDADE_LABELS[a.servico_unidade] : '',
                  Valor: a.valor_calculado,
                  Status: STATUS_ATIVIDADE_LABELS[a.status],
                })),
                `relatorio_${data.instalador_nome.replace(/\s+/g, '_')}`
              )}
              className="btn-secondary flex items-center gap-2"
            >
              <Download size={16} /> Excel
            </button>
            <button onClick={imprimir} className="btn-secondary flex items-center gap-2">
              <Printer size={16} /> Imprimir
            </button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="card p-6 mb-6 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Instalador *</label>
            <select
              value={instaladorId}
              onChange={(e) => setInstaladorId(e.target.value ? Number(e.target.value) : '')}
              className="input"
            >
              <option value="">Selecione um instalador...</option>
              {instaladores.map((i) => (
                <option key={i.id} value={i.id}>{i.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Data início</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Data fim</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="input" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={buscar}
            disabled={!instaladorId || isLoading}
            className="btn-primary flex items-center gap-2"
          >
            <FileText size={16} />
            {isLoading ? 'Carregando...' : 'Gerar relatório'}
          </button>
        </div>
      </div>

      {buscou && !isLoading && !data && (
        <div className="text-center py-12 text-gray-400">Nenhum dado encontrado.</div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Cabeçalho do relatório */}
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-1">{data.instalador_nome}</h2>
            <p className="text-sm text-gray-500">CPF: {data.instalador_cpf}</p>
            {data.chave_pix && <p className="text-sm text-gray-500">Pix: {data.chave_pix}</p>}
            {(data.periodo_inicio || data.periodo_fim) && (
              <p className="text-sm text-gray-500 mt-1">
                Período: {data.periodo_inicio ? formatDate(data.periodo_inicio) : '—'} até {data.periodo_fim ? formatDate(data.periodo_fim) : '—'}
              </p>
            )}
          </div>

          {/* Cards de resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { label: 'Atividades', value: String(data.total_atividades), color: 'border-t-blue-500' },
              { label: 'Valor Bruto', value: formatCurrency(data.total_bruto), color: 'border-t-emerald-500' },
              { label: 'Adiantamentos', value: formatCurrency(data.total_adiantamentos), color: 'border-t-amber-500' },
              { label: 'Valor Líquido', value: formatCurrency(data.total_liquido), color: 'border-t-primary' },
            ].map((c) => (
              <div key={c.label} className={`card p-5 border-t-[3px] ${c.color}`}>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{c.value}</p>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Pagamentos */}
          {data.pagamentos.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b dark:border-gray-700">
                <h3 className="font-semibold">Pagamentos ({data.pagamentos.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead>
                    <tr className="table-header">
                      <th className="px-4 py-3 text-left">Período</th>
                      <th className="px-4 py-3 text-right">Bruto</th>
                      <th className="px-4 py-3 text-right">Adiantamentos</th>
                      <th className="px-4 py-3 text-right">Líquido</th>
                      <th className="px-4 py-3 text-left">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data.pagamentos.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {formatDate(p.semana_inicio)} – {formatDate(p.semana_fim)}
                        </td>
                        <td className="px-4 py-3 text-right">{formatCurrency(p.valor_bruto)}</td>
                        <td className="px-4 py-3 text-right text-amber-600">{formatCurrency(p.valor_adiantamentos)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">{formatCurrency(p.valor_liquido)}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.criado_em ? formatDate(p.criado_em.slice(0, 10)) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Atividades */}
          {data.atividades.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b dark:border-gray-700">
                <h3 className="font-semibold">Atividades ({data.atividades.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="table-header">
                      <th className="px-4 py-3 text-left">Data</th>
                      <th className="px-4 py-3 text-left">Obra</th>
                      <th className="px-4 py-3 text-left">Serviço</th>
                      <th className="px-4 py-3 text-right">Qtd</th>
                      <th className="px-4 py-3 text-right">Valor</th>
                      <th className="px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data.atividades.map((a) => (
                      <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatDate(a.data_execucao)}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {a.obra_cliente ?? '—'}
                          {a.obra_numero_pedido && <span className="block text-xs text-gray-400">{a.obra_numero_pedido}</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{a.servico_descricao ?? '—'}</td>
                        <td className="px-4 py-3 text-right dark:text-gray-300">
                          {formatQuantidade(a.quantidade)} {a.servico_unidade ? UNIDADE_LABELS[a.servico_unidade] : ''}
                        </td>
                        <td className="px-4 py-3 text-right font-medium dark:text-gray-200">{formatCurrency(a.valor_calculado)}</td>
                        <td className="px-4 py-3">
                          <span className={statusBadge[a.status]}>{STATUS_ATIVIDADE_LABELS[a.status]}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
