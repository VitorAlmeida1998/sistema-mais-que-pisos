import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Wrench } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { servicosApi } from '@/services/api'
import { formatCurrency, UNIDADE_LABELS, getApiError } from '@/lib/utils'
import { useConfirm } from '@/hooks/useConfirm'
import { useAuth } from '@/hooks/useAuth'
import { usePagination } from '@/hooks/usePagination'
import { useResponsivePageSize } from '@/hooks/useResponsivePageSize'
import { Pagination } from '@/components/ui/Pagination'
import type { Servico } from '@/types'

const schema = z.object({
  descricao: z.string().min(2, 'Descrição obrigatória'),
  unidade: z.enum(['m2', 'unidade', 'diaria', 'metro_linear']),
  valor_unitario: z.string().refine((v) => parseFloat(v) > 0, 'Valor deve ser positivo'),
  ativo: z.boolean().optional(),
})
type FormData = z.infer<typeof schema>

function ServicoModal({ servico, onClose }: { servico?: Servico; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: servico
      ? { descricao: servico.descricao, unidade: servico.unidade, valor_unitario: servico.valor_unitario, ativo: servico.ativo }
      : { unidade: 'm2' },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      servico ? servicosApi.update(servico.id, data) : servicosApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos'] })
      toast.success(servico ? 'Serviço atualizado' : 'Serviço cadastrado')
      onClose()
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
        <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{servico ? 'Editar Serviço' : 'Novo Serviço'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="label">Descrição *</label>
            <input {...register('descricao')} className="input" />
            {errors.descricao && <p className="text-xs text-red-600 mt-1">{errors.descricao.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Unidade *</label>
              <select {...register('unidade')} className="input">
                <option value="m2">m²</option>
                <option value="metro_linear">Metro linear</option>
                <option value="unidade">Unidade</option>
                <option value="diaria">Diária</option>
              </select>
            </div>
            <div>
              <label className="label">Valor Unitário *</label>
              <input {...register('valor_unitario')} type="number" step="0.01" min="0.01" className="input" />
              {errors.valor_unitario && <p className="text-xs text-red-600 mt-1">{errors.valor_unitario.message}</p>}
            </div>
          </div>
          {servico && (
            <div className="flex items-center gap-2">
              <input type="checkbox" {...register('ativo')} id="ativo" className="rounded border-gray-300" />
              <label htmlFor="ativo" className="text-sm text-gray-700">Ativo</label>
            </div>
          )}
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

export default function Servicos() {
  const { isAdmin } = useAuth()
  const { confirm, dialog } = useConfirm()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Servico | undefined>()
  const [search, setSearch] = useState('')

  const { data = [], isLoading } = useQuery({
    queryKey: ['servicos'],
    queryFn: () => servicosApi.list({ apenas_ativos: false }).then((r) => r.data),
  })
  const filtered = data.filter((s) => s.descricao.toLowerCase().includes(search.toLowerCase()))
  const pageSize = useResponsivePageSize()
  const { page, setPage, paginated, total } = usePagination(filtered, pageSize)

  const deleteMutation = useMutation({
    mutationFn: (id: number) => servicosApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos'] })
      toast.success('Serviço excluído')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  async function handleDelete(s: Servico) {
    const ok = await confirm(`Excluir serviço "${s.descricao}"?`, 'Esta ação não pode ser desfeita.')
    if (!ok) return
    deleteMutation.mutate(s.id)
  }

  if (!isAdmin) return <div className="text-center py-12 text-gray-500">Acesso restrito a administradores.</div>

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Serviços</h1>
          <p className="text-sm text-gray-500">{total} registro(s)</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Buscar por descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-48 text-sm"
          />
          <button onClick={() => { setEditing(undefined); setShowModal(true) }} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Novo Serviço
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[400px]">
          <thead>
            <tr className="table-header">
              <th className="px-4 py-3 text-left">Descrição</th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">Unidade</th>
              <th className="px-4 py-3 text-right">Valor Unitário</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading ? (
              <TableSkeleton cols={5} />
            ) : filtered.length === 0 ? (
              <EmptyState icon={Wrench} title="Nenhum serviço encontrado" description={search ? 'Tente outro termo de busca.' : 'Adicione os tipos de serviço para usar nas atividades.'} />
            ) : (
              paginated.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{s.descricao}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{UNIDADE_LABELS[s.unidade]}</td>
                  <td className="px-4 py-3 text-right font-medium dark:text-gray-200">{formatCurrency(s.valor_unitario)}</td>
                  <td className="px-4 py-3">
                    <span className={s.ativo ? 'badge-ativo' : 'badge-inativo'}>{s.ativo ? 'Ativo' : 'Inativo'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditing(s); setShowModal(true) }} className="p-1 text-gray-400 hover:text-primary rounded">
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        disabled={deleteMutation.isPending}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination page={page} total={total} pageSize={pageSize} onChange={setPage} />
        </div>
      </div>

      {showModal && <ServicoModal servico={editing} onClose={() => { setShowModal(false); setEditing(undefined) }} />}
      {dialog}
    </div>
  )
}
