import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { pagamentosApi, instaladoresApi } from '@/services/api'
import { formatCurrency, formatDate, UNIDADE_LABELS } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import type { PagamentoPreview } from '@/types'

export default function FechamentoSemanal() {
  const { isGestor } = useAuth()
  const [instaladorId, setInstaladorId] = useState('')
  const [semanaInicio, setSemanaInicio] = useState('')
  const [semanaFim, setSemanaFim] = useState('')
  const [preview, setPreview] = useState<PagamentoPreview | null>(null)
  const [sucesso, setSucesso] = useState(false)

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
    onSuccess: () => { setPreview(null); setSucesso(true); setInstaladorId(''); setSemanaInicio(''); setSemanaFim('') },
  })

  if (!isGestor) return <div className="text-center py-12 text-gray-500">Acesso restrito a gestores e administradores.</div>

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Fechamento Semanal</h1>

      {sucesso && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <p className="text-green-800 font-medium">Pagamento efetivado com sucesso! O PDF foi gerado.</p>
          <button onClick={() => setSucesso(false)} className="text-green-600 hover:text-green-800 text-xl">&times;</button>
        </div>
      )}

      {/* Formulário de busca */}
      <div className="card p-6 mb-6">
        <h2 className="text-base font-semibold mb-4">Parâmetros</h2>
        <div className="grid grid-cols-3 gap-4">
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
            {(previewMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao calcular'}
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
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Atividades Aprovadas ({preview.atividades.length})</h3>
            {preview.atividades.length === 0 ? (
              <p className="text-sm text-gray-400 mb-4">Nenhuma atividade aprovada no período.</p>
            ) : (
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="table-header">
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">Obra</th>
                    <th className="px-3 py-2 text-left">Serviço</th>
                    <th className="px-3 py-2 text-right">Qtd</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.atividades.map((a) => (
                    <tr key={a.id}>
                      <td className="px-3 py-2">{formatDate(a.data_execucao)}</td>
                      <td className="px-3 py-2">{a.obra_cliente}</td>
                      <td className="px-3 py-2">{a.servico_descricao}</td>
                      <td className="px-3 py-2 text-right">{a.quantidade} {a.servico_unidade ? UNIDADE_LABELS[a.servico_unidade] : ''}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(a.valor_calculado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Adiantamentos */}
            {preview.adiantamentos_pendentes.length > 0 && (
              <>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Adiantamentos a Descontar ({preview.adiantamentos_pendentes.length})</h3>
                <table className="w-full text-sm mb-4">
                  <thead>
                    <tr className="table-header">
                      <th className="px-3 py-2 text-left">Data</th>
                      <th className="px-3 py-2 text-left">Descrição</th>
                      <th className="px-3 py-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.adiantamentos_pendentes.map((adt) => (
                      <tr key={adt.id}>
                        <td className="px-3 py-2">{formatDate(adt.data)}</td>
                        <td className="px-3 py-2">{adt.descricao ?? '—'}</td>
                        <td className="px-3 py-2 text-right font-medium text-warning">{formatCurrency(adt.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* Totais */}
            <div className="border-t pt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Valor Bruto:</span>
                <span className="font-medium">{formatCurrency(preview.valor_bruto)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">(-) Adiantamentos:</span>
                <span className="font-medium text-warning">{formatCurrency(preview.valor_adiantamentos)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-2 mt-2">
                <span>Valor Líquido:</span>
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
          {efetivarMutation.isError && (
            <p className="text-sm text-red-600">
              {(efetivarMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao efetivar'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
