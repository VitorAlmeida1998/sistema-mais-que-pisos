import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { obrasApi } from '@/services/api'
import { formatDate, STATUS_OBRA_LABELS } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import type { Obra } from '@/types'

const schema = z.object({
  cliente_nome: z.string().min(2, 'Nome obrigatório'),
  endereco: z.string().min(5, 'Endereço obrigatório'),
  data_inicio: z.string().min(1, 'Data obrigatória'),
  data_fim_prevista: z.string().optional(),
  status: z.enum(['em_andamento', 'concluida', 'cancelada']),
  observacoes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

function ObraModal({ obra, onClose }: { obra?: Obra; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: obra
      ? {
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
      qc.invalidateQueries({ queryKey: ['obras'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">{obra ? 'Editar Obra' : 'Nova Obra'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
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
          {mutation.isError && (
            <p className="text-sm text-red-600">
              {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao salvar'}
            </p>
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

const statusBadge: Record<string, string> = {
  em_andamento: 'badge-aprovada',
  concluida: 'badge-paga',
  cancelada: 'badge-inativo',
}

export default function Obras() {
  const { canWrite } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Obra | undefined>()
  const [apenasAtivas, setApenasAtivas] = useState(true)

  const { data = [], isLoading } = useQuery({
    queryKey: ['obras', apenasAtivas],
    queryFn: () => obrasApi.list({ apenas_ativas: apenasAtivas }).then((r) => r.data),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Obras</h1>
          <p className="text-sm text-gray-500">{data.length} registro(s)</p>
        </div>
        <div className="flex items-center gap-3">
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
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="px-4 py-3 text-left">Cliente</th>
              <th className="px-4 py-3 text-left">Endereço</th>
              <th className="px-4 py-3 text-left">Início</th>
              <th className="px-4 py-3 text-left">Previsão</th>
              <th className="px-4 py-3 text-left">Status</th>
              {canWrite && <th className="px-4 py-3 text-left">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Carregando...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nenhuma obra encontrada</td></tr>
            ) : (
              data.map((obra) => (
                <tr key={obra.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{obra.cliente_nome}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{obra.endereco}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(obra.data_inicio)}</td>
                  <td className="px-4 py-3 text-gray-600">{obra.data_fim_prevista ? formatDate(obra.data_fim_prevista) : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={statusBadge[obra.status] ?? 'badge-inativo'}>
                      {STATUS_OBRA_LABELS[obra.status]}
                    </span>
                  </td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <button onClick={() => { setEditing(obra); setShowModal(true) }} className="p-1 text-gray-400 hover:text-primary rounded">
                        <Pencil size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && <ObraModal obra={editing} onClose={() => { setShowModal(false); setEditing(undefined) }} />}
    </div>
  )
}
