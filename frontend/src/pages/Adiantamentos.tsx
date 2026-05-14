import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Wallet, Pencil, Trash2 } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { adiantamentosApi, instaladoresApi } from '@/services/api'
import { formatCurrency, formatDate, getApiError } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useConfirm } from '@/hooks/useConfirm'
import { usePagination } from '@/hooks/usePagination'
import { useResponsivePageSize } from '@/hooks/useResponsivePageSize'
import type { Adiantamento } from '@/types'

const schema = z.object({
  instalador_id: z.coerce.number().min(1, 'Selecione um instalador'),
  valor: z.coerce.number().positive('Valor deve ser positivo'),
  data: z.string().min(1, 'Data obrigatória'),
  descricao: z.string().optional(),
})
type FormData = z.infer<typeof schema>

function AdiantamentoModal({ adiantamento, onClose }: { adiantamento?: Adiantamento; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: adiantamento ? {
      instalador_id: adiantamento.instalador_id,
      valor: Number(adiantamento.valor),
      data: adiantamento.data,
      descricao: adiantamento.descricao ?? '',
    } : undefined,
  })

  const { data: instaladores = [] } = useQuery({
    queryKey: ['instaladores', true],
    queryFn: () => instaladoresApi.list({ apenas_ativos: true }).then((r) => r.data),
    enabled: !adiantamento,
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      if (adiantamento) {
        const { instalador_id: _id, ...editData } = data
        return adiantamentosApi.update(adiantamento.id, editData)
      }
      return adiantamentosApi.create(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adiantamentos'] })
      toast.success(adiantamento ? 'Adiantamento atualizado' : 'Adiantamento registrado')
      onClose()
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
        <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{adiantamento ? 'Editar Adiantamento' : 'Novo Adiantamento'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          {adiantamento ? (
            <div>
              <label className="label">Instalador</label>
              <input
                value={adiantamento.instalador_nome ?? `#${adiantamento.instalador_id}`}
                disabled
                className="input bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed"
              />
            </div>
          ) : (
            <div>
              <label className="label">Instalador *</label>
              <select {...register('instalador_id')} className="input">
                <option value="">Selecione...</option>
                {instaladores.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
              </select>
              {errors.instalador_id && <p className="text-xs text-red-600 mt-1">{errors.instalador_id.message}</p>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Valor (R$) *</label>
              <input {...register('valor')} type="number" step="0.01" min="0.01" className="input" />
              {errors.valor && <p className="text-xs text-red-600 mt-1">{errors.valor.message}</p>}
            </div>
            <div>
              <label className="label">Data *</label>
              <input {...register('data')} type="date" className="input" />
              {errors.data && <p className="text-xs text-red-600 mt-1">{errors.data.message}</p>}
            </div>
          </div>
          <div>
            <label className="label">Descrição</label>
            <textarea {...register('descricao')} className="input h-16 resize-none" />
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

export default function Adiantamentos() {
  const { canWrite } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Adiantamento | undefined>()
  const { confirm, dialog } = useConfirm()
  const queryClient = useQueryClient()

  const { data = [], isLoading } = useQuery({
    queryKey: ['adiantamentos'],
    queryFn: () => adiantamentosApi.list().then((r) => r.data),
  })

  const pageSize = useResponsivePageSize()
  const { page, setPage, paginated, total } = usePagination(data, pageSize)

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adiantamentosApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adiantamentos'] })
      toast.success('Adiantamento excluído')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const handleDelete = async (adt: Adiantamento) => {
    const ok = await confirm(
      `Excluir adiantamento de ${formatCurrency(adt.valor)}?`,
      'Esta ação não pode ser desfeita.',
      'Excluir'
    )
    if (ok) deleteMutation.mutate(adt.id)
  }

  const openEdit = (adt: Adiantamento) => {
    setEditing(adt)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditing(undefined)
  }

  const cols = canWrite ? 6 : 5

  return (
    <div>
      {dialog}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Adiantamentos</h1>
          <p className="text-sm text-gray-500">{total} registro(s)</p>
        </div>
        {canWrite && (
          <button onClick={() => { setEditing(undefined); setShowModal(true) }} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Novo Adiantamento
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">Instalador</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Descrição</th>
                <th className="px-4 py-3 text-left">Situação</th>
                {canWrite && <th className="px-4 py-3 text-left">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {isLoading ? (
                <TableSkeleton cols={cols} />
              ) : data.length === 0 ? (
                <EmptyState icon={Wallet} title="Nenhum adiantamento registrado" description="Adiantamentos descontados no fechamento semanal aparecem aqui." />
              ) : (
                paginated.map((adt) => (
                  <tr key={adt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{adt.instalador_nome ?? `#${adt.instalador_id}`}</td>
                    <td className="px-4 py-3 text-right font-medium text-warning">{formatCurrency(adt.valor)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatDate(adt.data)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{adt.descricao ?? '—'}</td>
                    <td className="px-4 py-3">
                      {adt.pagamento_id ? (
                        <span className="badge-paga">Descontado (Pag. #{adt.pagamento_id})</span>
                      ) : (
                        <span className="badge-pendente">Pendente</span>
                      )}
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3">
                        {!adt.pagamento_id && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEdit(adt)}
                              className="p-1 text-gray-400 hover:text-primary rounded transition-colors"
                              title="Editar"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(adt)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} pageSize={pageSize} onChange={setPage} />
      </div>

      {showModal && <AdiantamentoModal adiantamento={editing} onClose={closeModal} />}
    </div>
  )
}
