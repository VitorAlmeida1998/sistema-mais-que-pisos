import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { pagamentosApi, instaladoresApi } from '@/services/api'
import { formatCurrency, formatDate, UNIDADE_LABELS, getApiError } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import type { PagamentoPreview } from '@/types'

export default function FechamentoSemanal() {
  const { isGestor } = useAuth()
  const [instaladorId, setInstaladorId] = useState('')
  const [semanaInicio, setSemanaInicio] = useState('')
  const [semanaFim, setSemanaFim] = useState('')
  const [preview, setPreview] = useState<PagamentoPreview | null>(null)

  const { data: instaladores = [] } = useQuery({
    queryKey: ['instaladores', true],
    queryFn: () => instaladoresApi.list({ apenas_ativos: true }).then((r) => r.data),
  })

  const previewMutation = useMutation({
    mutationFn: () =>
      pagamentosApi.preview({
        instalador_id: Number(instaladorId),
        semana_inicio: semanaInicio,
        semana_fim: semanaFim,
      }).then((r) => r.data),
    onSuccess: (data) => setPreview(data),
  })

  const efetivarMutation = useMutation({
    mutationFn: () =>
      pagamentosApi.efetivar({
        instalador_id: Number(instaladorId),
        semana_inicio: semanaInicio,
        semana_fim: semanaFim,
        data_pagamento: new Date().toISOString().slice(0, 10),
      }),
    onSuccess: async (response) => {
      const pagamento = response.data
      try {
        const pdf = await pagamentosApi.recibo(pagamento.id)
        const url = URL.createObjectURL(new Blob([pdf.data], { type: 'application/pdf' }))
        const a = document.createElement('a')
        a.href = url
        a.download = `recibo_pagamento_${pagamento.id}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Pagamento efetivado! PDF baixando...')
      } catch {
        toast.success('Pagamento efetivado!')
        toast.error('Não foi possível baixar o PDF agora. Acesse em Pagamentos.')
      }
      setPreview(null)
      setInstaladorId('')
      setSemanaInicio('')
      setSemanaFim('')
    },
    onError: (err) => toast.error(getApiError(err, 'Erro ao efetivar pagamento')),
  })

  if (!isGestor) return <div className="text-center py-12 text-gray-500">Acesso restrito a gestores e administradores.</div>

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Fechamento Semanal</h1>

      {/* Formulário de busca */}
      <div className="card p-6 mb-6">
        <h2 className="text-base font-semibold mb-4">Parâmetros</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="label">Instalador *</label>
            <select value={instaladorId} onChange={(e) => setInstaladorId(e.target.value)} className="input">
              <option value="">Selecione...</option>
              {instaladores.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Data Início *</label>
            <input type="date" value={semanaInicio} onChange={(e) => setSemanaInicio(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Data Fim *</label>
            <input type="date" value={semanaFim} onChange={(e) => setSemanaFim(e.target.value)} className="input" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => previewMutation.mutate()}
            disabled={!instaladorId || !semanaInicio || !semanaFim || previewMutation.isPending}
            className="btn-primary"
          >
            {previewMutation.isPending ? 'Calculando...' : 'Calcular Preview'}
          </button>
        </div>
        {previewMutation.isError && (
          <p className="text-sm text-red-600 mt-2">
            {getApiError(previewMutation.error, 'Erro ao calcular')}
          </p>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="text-base font-semibold mb-3">
              Preview — {preview.instalador_nome} | {formatDate(preview.semana_inicio)} a {formatDate(preview.semana_fim)}
            </h2>

            {/* Atividades */}
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Atividades Aprovadas ({preview.atividades.length})</h3>
            {preview.atividades.length === 0 ? (
              <p className="text-sm text-gray-400 mb-4">Nenhuma atividade aprovada no período.</p>
            ) : (
              <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm min-w-[420px]">
                <thead>
                  <tr className="table-header">
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left hidden sm:table-cell">Obra</th>
                    <th className="px-3 py-2 text-left hidden sm:table-cell">Serviço</th>
                    <th className="px-3 py-2 text-right hidden sm:table-cell">Qtd</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.atividades.map((a) => (
                    <tr key={a.id}>
                      <td className="px-3 py-2">{formatDate(a.data_execucao)}</td>
                      <td className="px-3 py-2 hidden sm:table-cell">{a.obra_cliente}</td>
                      <td className="px-3 py-2 hidden sm:table-cell">{a.servico_descricao}</td>
                      <td className="px-3 py-2 text-right hidden sm:table-cell">{a.quantidade} {a.servico_unidade ? UNIDADE_LABELS[a.servico_unidade] : ''}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(a.valor_calculado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}

            {/* Adiantamentos */}
            {preview.adiantamentos_pendentes.length > 0 && (
              <>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Adiantamentos a Descontar ({preview.adiantamentos_pendentes.length})</h3>
                <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm min-w-[320px]">
                  <thead>
                    <tr className="table-header">
                      <th className="px-3 py-2 text-left">Data</th>
                      <th className="px-3 py-2 text-left hidden sm:table-cell">Descrição</th>
                      <th className="px-3 py-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.adiantamentos_pendentes.map((adt) => (
                      <tr key={adt.id}>
                        <td className="px-3 py-2">{formatDate(adt.data)}</td>
                        <td className="px-3 py-2 hidden sm:table-cell">{adt.descricao ?? '—'}</td>
                        <td className="px-3 py-2 text-right font-medium text-warning">{formatCurrency(adt.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            )}

            {/* Totais */}
            <div className="border-t dark:border-gray-700 pt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Valor Bruto:</span>
                <span className="font-medium dark:text-gray-200">{formatCurrency(preview.valor_bruto)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">(-) Adiantamentos:</span>
                <span className="font-medium text-warning">{formatCurrency(preview.valor_adiantamentos)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t dark:border-gray-700 pt-2 mt-2">
                <span className="dark:text-gray-100">Valor Líquido:</span>
                <span className="text-success">{formatCurrency(preview.valor_liquido)}</span>
              </div>
            </div>
          </div>

          {preview.atividades.length > 0 && (
            <div className="flex justify-end gap-3">
              <button onClick={() => setPreview(null)} className="btn-secondary">Cancelar</button>
              <button
                onClick={() => efetivarMutation.mutate()}
                disabled={efetivarMutation.isPending}
                className="btn-primary"
              >
                {efetivarMutation.isPending ? 'Processando...' : 'Confirmar Pagamento e Gerar PDF'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
