import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { adiantamentosApi, instaladoresApi } from '@/services/api'
import { formatCurrency, formatDate, getApiError } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

const schema = z.object({
  instalador_id: z.coerce.number().min(1, 'Selecione um instalador'),
  valor: z.coerce.number().positive('Valor deve ser positivo'),
  data: z.string().min(1, 'Data obrigatória'),
  descricao: z.string().optional(),
})
type FormData = z.infer<typeof schema>

function AdiantamentoModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })
  const { data: instaladores = [] } = useQuery({
    queryKey: ['instaladores', true],
    queryFn: () => instaladoresApi.list({ apenas_ativos: true }).then((r) => r.data),
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => adiantamentosApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adiantamentos'] }); onClose() },
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
        <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Novo Adiantamento</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="label">Instalador *</label>
            <select {...register('instalador_id')} className="input">
              <option value="">Selecione...</option>
              {instaladores.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
            </select>
            {errors.instalador_id && <p className="text-xs text-red-600 mt-1">{errors.instalador_id.message}</p>}
          </div>
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
          {mutation.isError && (
            <p className="text-sm text-red-600">
              {getApiError(mutation.error)}
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

export default function Adiantamentos() {
  const { canWrite } = useAuth()
  const [showModal, setShowModal] = useState(false)

  const { data = [], isLoading } = useQuery({
    queryKey: ['adiantamentos'],
    queryFn: () => adiantamentosApi.list().then((r) => r.data),
  })

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Adiantamentos</h1>
          <p className="text-sm text-gray-500">{data.length} registro(s)</p>
        </div>
        {canWrite && (
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Novo Adiantamento
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="table-header">
              <th className="px-4 py-3 text-left">Instalador</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3 text-left">Data</th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">Descrição</th>
              <th className="px-4 py-3 text-left">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Carregando...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhum adiantamento encontrado</td></tr>
            ) : (
              data.map((adt) => (
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
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {showModal && <AdiantamentoModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
