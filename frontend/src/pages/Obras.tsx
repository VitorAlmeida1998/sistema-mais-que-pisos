import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Building2, FileDown, ClipboardList } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { obrasApi, atividadesApi } from '@/services/api'
import { formatDate, formatCurrency, formatQuantidade, STATUS_OBRA_LABELS, STATUS_ATIVIDADE_LABELS, UNIDADE_LABELS, getApiError } from '@/lib/utils'
import { useConfirm } from '@/hooks/useConfirm'
import { useAuth } from '@/hooks/useAuth'
import { usePagination } from '@/hooks/usePagination'
import { useResponsivePageSize } from '@/hooks/useResponsivePageSize'
import { Pagination } from '@/components/ui/Pagination'
import type { Obra, Atividade, StatusAtividade } from '@/types'

const statusBadgeAtividade: Record<StatusAtividade, string> = {
  pendente: 'badge-pendente',
  aprovada: 'badge-aprovada',
  paga: 'badge-paga',
}

function ObraDetalheModal({ obra, onClose }: { obra: Obra; onClose: () => void }) {
  const [downloading, setDownloading] = useState(false)
  const pageSize = useResponsivePageSize()

  const { data: atividades = [], isLoading } = useQuery({
    queryKey: ['atividades', 'obra', obra.id],
    queryFn: () => atividadesApi.list({ obra_id: obra.id, limit: 500 }).then((r) => r.data),
  })

  const { page, setPage, paginated, total } = usePagination(atividades, pageSize)

  const totalValor = atividades.reduce((s, a) => s + parseFloat(a.valor_calculado), 0)
  const byStatus = (st: StatusAtividade) => atividades.filter((a) => a.status === st)
  const somaStatus = (st: StatusAtividade) => byStatus(st).reduce((s, a) => s + parseFloat(a.valor_calculado), 0)

  async function handlePDF() {
    setDownloading(true)
    try {
      const res = await obrasApi.relatorioObra(obra.id)
      const url = URL.createObjectURL(res.data as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `relatorio_obra_${obra.numero_pedido ?? obra.id}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Erro ao gerar PDF')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {obra.numero_pedido && (
              <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-lg flex-shrink-0">
                {obra.numero_pedido}
              </span>
            )}
            <h2 className="text-lg font-semibold truncate">{obra.cliente_nome}</h2>
            <span className={`${statusBadge[obra.status] ?? 'badge-inativo'} flex-shrink-0`}>
              {STATUS_OBRA_LABELS[obra.status]}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl ml-4 flex-shrink-0">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Obra info */}
          <div className="px-6 pt-5 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b dark:border-gray-700">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Endereço</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{obra.endereco}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Início</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{formatDate(obra.data_inicio)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Previsão de Término</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {obra.data_fim_prevista ? formatDate(obra.data_fim_prevista) : '—'}
              </p>
            </div>
            {obra.observacoes && (
              <div className="col-span-2 sm:col-span-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Observações</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{obra.observacoes}</p>
              </div>
            )}
          </div>

          {/* Atividades header */}
          <div className="px-6 pt-4 pb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Atividades {!isLoading && `(${total})`}
            </p>
            {atividades.length > 0 && (
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Total: {formatCurrency(totalValor)}
              </p>
            )}
          </div>

          {/* Atividades table */}
          <div className="px-6 pb-2">
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="table-header">
                      <th className="px-4 py-3 text-left">Data</th>
                      <th className="px-4 py-3 text-left hidden sm:table-cell">Instalador</th>
                      <th className="px-4 py-3 text-left">Serviço</th>
                      <th className="px-4 py-3 text-right hidden sm:table-cell">Qtd</th>
                      <th className="px-4 py-3 text-right">Valor</th>
                      <th className="px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {isLoading ? (
                      <TableSkeleton cols={6} />
                    ) : atividades.length === 0 ? (
                      <EmptyState
                        icon={ClipboardList}
                        title="Nenhuma atividade"
                        description="Esta obra ainda não tem atividades registradas."
                      />
                    ) : (
                      paginated.map((a: Atividade) => (
                        <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{formatDate(a.data_execucao)}</td>
                          <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{a.instalador_nome ?? '—'}</td>
                          <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 max-w-[160px] truncate">{a.servico_descricao ?? '—'}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                            {formatQuantidade(a.quantidade)} {a.servico_unidade ? UNIDADE_LABELS[a.servico_unidade] : ''}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium dark:text-gray-200">{formatCurrency(a.valor_calculado)}</td>
                          <td className="px-4 py-2.5">
                            <span className={statusBadgeAtividade[a.status]}>{STATUS_ATIVIDADE_LABELS[a.status]}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={total} pageSize={pageSize} onChange={setPage} />
            </div>
          </div>

          {/* Totais por status */}
          {atividades.length > 0 && (
            <div className="px-6 pb-5 pt-1 grid grid-cols-3 gap-3">
              {(['pendente', 'aprovada', 'paga'] as StatusAtividade[]).map((st) => (
                <div key={st} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-center">
                  <span className={`${statusBadgeAtividade[st]} mb-1.5 inline-block`}>{STATUS_ATIVIDADE_LABELS[st]}</span>
                  <p className="text-xs text-gray-500">{byStatus(st).length} atividade(s)</p>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(somaStatus(st))}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t dark:border-gray-700 flex justify-end gap-3 flex-shrink-0">
          <button type="button" onClick={onClose} className="btn-secondary">Fechar</button>
          <button
            type="button"
            onClick={handlePDF}
            disabled={downloading}
            className="btn-primary flex items-center gap-2"
          >
            <FileDown size={16} />
            {downloading ? 'Gerando...' : 'Baixar PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}

const schema = z.object({
  numero_pedido: z.string().optional(),
  cliente_nome: z.string().min(2, 'Nome obrigatório'),
  endereco: z.string().min(5, 'Endereço obrigatório'),
  data_inicio: z.string().min(1, 'Data obrigatória'),
  data_fim_prevista: z.string().optional(),
  status: z.enum(['em_andamento', 'concluida', 'cancelada']),
  observacoes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

function ObraModal({ obra, onClose }: { obra?: Obra; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: obra
      ? {
          numero_pedido: obra.numero_pedido ?? '',
          cliente_nome: obra.cliente_nome,
          endereco: obra.endereco,
          data_inicio: obra.data_inicio,
          data_fim_prevista: obra.data_fim_prevista ?? '',
          status: obra.status,
          observacoes: obra.observacoes ?? '',
        }
      : { status: 'em_andamento' },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      obra ? obrasApi.update(obra.id, data) : obrasApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(obra ? 'Obra atualizada' : 'Obra cadastrada')
      onClose()
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg">
        <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{obra ? 'Editar Obra' : 'Nova Obra'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="label">Nº do Pedido</label>
            <input {...register('numero_pedido')} className="input" placeholder="Ex: PED-2024-001" />
          </div>
          <div>
            <label className="label">Cliente *</label>
            <input {...register('cliente_nome')} className="input" />
            {errors.cliente_nome && <p className="text-xs text-red-600 mt-1">{errors.cliente_nome.message}</p>}
          </div>
          <div>
            <label className="label">Endereço *</label>
            <input {...register('endereco')} className="input" />
            {errors.endereco && <p className="text-xs text-red-600 mt-1">{errors.endereco.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Data Início *</label>
              <input {...register('data_inicio')} type="date" className="input" />
            </div>
            <div>
              <label className="label">Previsão Término</label>
              <input {...register('data_fim_prevista')} type="date" className="input" />
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <select {...register('status')} className="input">
              <option value="em_andamento">Em andamento</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <div>
            <label className="label">Observações</label>
            <textarea {...register('observacoes')} className="input h-20 resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const statusBadge: Record<string, string> = {
  em_andamento: 'badge-aprovada',
  concluida: 'badge-paga',
  cancelada: 'badge-inativo',
}

export default function Obras() {
  const { canWrite, isAdmin } = useAuth()
  const { confirm, dialog } = useConfirm()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Obra | undefined>()
  const [detalhe, setDetalhe] = useState<Obra | null>(null)
  const [apenasAtivas, setApenasAtivas] = useState(true)
  const [search, setSearch] = useState('')

  const { data = [], isLoading } = useQuery({
    queryKey: ['obras', apenasAtivas],
    queryFn: () => obrasApi.list({ apenas_ativas: apenasAtivas }).then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => obrasApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obras'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Obra desativada')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  async function handleDelete(obra: Obra) {
    const ok = await confirm(`Desativar obra de "${obra.cliente_nome}"?`, 'A obra ficará inativa e não aparecerá nos filtros ativos.')
    if (!ok) return
    deleteMutation.mutate(obra.id)
  }

  const filtered = data.filter((o) =>
    o.cliente_nome.toLowerCase().includes(search.toLowerCase()) ||
    (o.numero_pedido ?? '').toLowerCase().includes(search.toLowerCase())
  )
  const pageSize = useResponsivePageSize()
  const { page, setPage, paginated, total } = usePagination(filtered, pageSize)

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Obras</h1>
          <p className="text-sm text-gray-500">{total} registro(s)</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Buscar por cliente ou pedido..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-56 text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={apenasAtivas} onChange={(e) => setApenasAtivas(e.target.checked)} className="rounded" />
            Apenas ativas
          </label>
          {canWrite && (
            <button onClick={() => { setEditing(undefined); setShowModal(true) }} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Nova Obra
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[540px]">
          <thead>
            <tr className="table-header">
              <th className="px-4 py-3 text-left hidden sm:table-cell">Nº Pedido</th>
              <th className="px-4 py-3 text-left">Cliente</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Endereço</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Início</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Previsão</th>
              <th className="px-4 py-3 text-left">Status</th>
              {canWrite && <th className="px-4 py-3 text-left">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading ? (
              <TableSkeleton cols={canWrite ? 7 : 6} />
            ) : filtered.length === 0 ? (
              <EmptyState icon={Building2} title="Nenhuma obra encontrada" description={search ? 'Tente outro termo de busca.' : apenasAtivas ? 'Não há obras ativas. Desmarque o filtro para ver todas.' : 'Cadastre a primeira obra para começar.'} />
            ) : (
              paginated.map((obra) => (
                <tr key={obra.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {obra.numero_pedido
                      ? <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-lg">{obra.numero_pedido}</span>
                      : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <button
                      onClick={() => setDetalhe(obra)}
                      className="text-primary hover:underline text-left"
                    >
                      {obra.cliente_nome}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-xs truncate hidden md:table-cell">{obra.endereco}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden lg:table-cell">{formatDate(obra.data_inicio)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden lg:table-cell">{obra.data_fim_prevista ? formatDate(obra.data_fim_prevista) : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={statusBadge[obra.status] ?? 'badge-inativo'}>
                      {STATUS_OBRA_LABELS[obra.status]}
                    </span>
                  </td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditing(obra); setShowModal(true) }} className="p-1 text-gray-400 hover:text-primary rounded">
                          <Pencil size={15} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(obra)}
                            disabled={deleteMutation.isPending}
                            className="p-1 text-gray-400 hover:text-red-600 rounded"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination page={page} total={total} pageSize={pageSize} onChange={setPage} />
        </div>
      </div>

      {showModal && <ObraModal obra={editing} onClose={() => { setShowModal(false); setEditing(undefined) }} />}
      {detalhe && <ObraDetalheModal obra={detalhe} onClose={() => setDetalhe(null)} />}
      {dialog}
    </div>
  )
}
