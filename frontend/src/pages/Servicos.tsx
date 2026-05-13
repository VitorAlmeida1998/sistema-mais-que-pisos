import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { servicosApi } from '@/services/api'
import { formatCurrency, UNIDADE_LABELS } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import type { Servico } from '@/types'

const schema = z.object({
  descricao: z.string().min(2, 'Descrição obrigatória'),
  unidade: z.enum(['m2', 'unidade', 'diaria', 'metro_linear']),
  valor_unitario: z.string().refine((v) => parseFloat(v) > 0, 'Valor deve ser positivo'),
  ativo: z.boolean().optional(),
})
type FormData = z.infer<typeof schema>

function ServicoModal({ servico, onClose }: { servico?: Servico; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: servico
      ? { descricao: servico.descricao, unidade: servico.unidade, valor_unitario: servico.valor_unitario, ativo: servico.ativo }
      : { unidade: 'm2' },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      servico ? servicosApi.update(servico.id, data) : servicosApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['servicos'] }); onClose() },
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">{servico ? 'Editar Serviço' : 'Novo Serviço'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
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

export default function Servicos() {
  const { isAdmin } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Servico | undefined>()

  const { data = [], isLoading } = useQuery({
    queryKey: ['servicos'],
    queryFn: () => servicosApi.list({ apenas_ativos: false }).then((r) => r.data),
  })

  if (!isAdmin) return <div className="text-center py-12 text-gray-500">Acesso restrito a administradores.</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Serviços</h1>
        <button onClick={() => { setEditing(undefined); setShowModal(true) }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Novo Serviço
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="px-4 py-3 text-left">Descrição</th>
              <th className="px-4 py-3 text-left">Unidade</th>
              <th className="px-4 py-3 text-right">Valor Unitário</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Carregando...</td></tr>
            ) : (
              data.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.descricao}</td>
                  <td className="px-4 py-3 text-gray-600">{UNIDADE_LABELS[s.unidade]}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(s.valor_unitario)}</td>
                  <td className="px-4 py-3">
                    <span className={s.ativo ? 'badge-ativo' : 'badge-inativo'}>{s.ativo ? 'Ativo' : 'Inativo'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setEditing(s); setShowModal(true) }} className="p-1 text-gray-400 hover:text-primary rounded">
                      <Pencil size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && <ServicoModal servico={editing} onClose={() => { setShowModal(false); setEditing(undefined) }} />}
    </div>
  )
}
