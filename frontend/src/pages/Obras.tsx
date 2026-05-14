import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { obrasApi } from '@/services/api'
import { formatDate, STATUS_OBRA_LABELS, getApiError } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import type { Obra } from '@/types'

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
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Obra | undefined>()
  const [apenasAtivas, setApenasAtivas] = useState(true)

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

  function handleDelete(obra: Obra) {
    if (!window.confirm(`Excluir obra "${obra.cliente_nome}"? Esta ação a tornará inativa.`)) return
    deleteMutation.mutate(obra.id)
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Obras</h1>
          <p className="text-sm text-gray-500">{data.length} registro(s)</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Carregando...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhuma obra encontrada</td></tr>
            ) : (
              data.map((obra) => (
                <tr key={obra.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {obra.numero_pedido
                      ? <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-lg">{obra.numero_pedido}</span>
                      : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{obra.cliente_nome}</td>
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
        </div>
      </div>

      {showModal && <ObraModal obra={editing} onClose={() => { setShowModal(false); setEditing(undefined) }} />}
    </div>
  )
}
