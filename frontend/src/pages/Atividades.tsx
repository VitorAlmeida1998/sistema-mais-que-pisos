import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CheckCircle, Trash2, Pencil } from 'lucide-react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { atividadesApi, instaladoresApi, obrasApi, servicosApi } from '@/services/api'
import { formatCurrency, formatDate, formatQuantidade, STATUS_ATIVIDADE_LABELS, UNIDADE_LABELS, getApiError } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import type { Atividade, StatusAtividade } from '@/types'

const linhaSchema = z.object({
  servico_id: z.coerce.number().min(1, 'Selecione um serviço'),
  quantidade: z.coerce.number().positive('Quantidade deve ser positiva'),
})

const schema = z.object({
  instalador_id: z.coerce.number().min(1, 'Selecione um instalador'),
  obra_id: z.coerce.number().min(1, 'Selecione uma obra'),
  data_execucao: z.string().min(1, 'Data obrigatória'),
  observacao: z.string().optional(),
  servicos: z.array(linhaSchema).min(1),
})
type FormData = z.infer<typeof schema>

function AtividadeModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { servicos: [{ servico_id: 0, quantidade: 0 }] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'servicos' })

  const { data: instaladores = [] } = useQuery({
    queryKey: ['instaladores', true],
    queryFn: () => instaladoresApi.list({ apenas_ativos: true }).then((r) => r.data),
  })
  const { data: obras = [] } = useQuery({
    queryKey: ['obras', true],
    queryFn: () => obrasApi.list({ apenas_ativas: true }).then((r) => r.data),
  })
  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos'],
    queryFn: () => servicosApi.list({ apenas_ativos: true }).then((r) => r.data),
  })

  const onSubmit = async (data: FormData) => {
    setSubmitError(null)
    try {
      await Promise.all(
        data.servicos.map((linha) =>
          atividadesApi.create({
            instalador_id: data.instalador_id,
            obra_id: data.obra_id,
            data_execucao: data.data_execucao,
            observacao: data.observacao,
            servico_id: linha.servico_id,
            quantidade: linha.quantidade,
          })
        )
      )
      queryClient.invalidateQueries({ queryKey: ['atividades'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    } catch (err) {
      setSubmitError(getApiError(err))
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold">Nova Atividade</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Campos compartilhados */}
            <div>
              <label className="label">Instalador *</label>
              <select {...register('instalador_id')} className="input">
                <option value="">Selecione...</option>
                {instaladores.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
              </select>
              {errors.instalador_id && <p className="text-xs text-red-500 mt-1">{errors.instalador_id.message}</p>}
            </div>
            <div>
              <label className="label">Obra *</label>
              <select {...register('obra_id')} className="input">
                <option value="">Selecione...</option>
                {obras.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.numero_pedido ? `[${o.numero_pedido}] ` : ''}{o.cliente_nome}
                  </option>
                ))}
              </select>
              {errors.obra_id && <p className="text-xs text-red-500 mt-1">{errors.obra_id.message}</p>}
            </div>
            <div>
              <label className="label">Data de Execução *</label>
              <input {...register('data_execucao')} type="date" className="input" />
              {errors.data_execucao && <p className="text-xs text-red-500 mt-1">{errors.data_execucao.message}</p>}
            </div>

            {/* Linhas de serviço */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="label mb-0">Serviços *</span>
                <button
                  type="button"
                  onClick={() => append({ servico_id: 0, quantidade: 0 })}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
                >
                  <Plus size={14} /> Adicionar serviço
                </button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Serviço {fields.length > 1 ? index + 1 : ''}
                      </span>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div>
                      <select {...register(`servicos.${index}.servico_id`)} className="input">
                        <option value="">Selecione um serviço...</option>
                        {servicos.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.descricao} — {formatCurrency(s.valor_unitario)}/{UNIDADE_LABELS[s.unidade]}
                          </option>
                        ))}
                      </select>
                      {errors.servicos?.[index]?.servico_id && (
                        <p className="text-xs text-red-500 mt-1">{errors.servicos[index].servico_id?.message}</p>
                      )}
                    </div>
                    <div>
                      <input
                        {...register(`servicos.${index}.quantidade`)}
                        type="number"
                        step="0.001"
                        placeholder="Quantidade"
                        className="input"
                      />
                      {errors.servicos?.[index]?.quantidade && (
                        <p className="text-xs text-red-500 mt-1">{errors.servicos[index].quantidade?.message}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Observação</label>
              <textarea {...register('observacao')} className="input h-16 resize-none" />
            </div>

            {submitError && <p className="text-sm text-red-500">{submitError}</p>}
          </div>

          <div className="px-6 py-4 border-t dark:border-gray-700 flex justify-end gap-3 flex-shrink-0">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting
                ? 'Salvando...'
                : fields.length > 1
                  ? `Salvar ${fields.length} serviços`
                  : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const editSchema = z.object({
  quantidade: z.coerce.number().positive('Quantidade deve ser positiva'),
  data_execucao: z.string().min(1, 'Data obrigatória'),
  observacao: z.string().optional(),
})
type EditFormData = z.infer<typeof editSchema>

function EditAtividadeModal({ atividade, onClose }: { atividade: Atividade; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      quantidade: Number(atividade.quantidade),
      data_execucao: atividade.data_execucao,
      observacao: atividade.observacao ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: (data: EditFormData) => atividadesApi.update(atividade.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atividades'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Editar Atividade</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          <div>
            <label className="label">Quantidade *</label>
            <input {...register('quantidade')} type="number" step="0.001" min="0.001" className="input" />
            {errors.quantidade && <p className="text-xs text-red-500 mt-1">{errors.quantidade.message}</p>}
          </div>
          <div>
            <label className="label">Data de Execução *</label>
            <input {...register('data_execucao')} type="date" className="input" />
            {errors.data_execucao && <p className="text-xs text-red-500 mt-1">{errors.data_execucao.message}</p>}
          </div>
          <div>
            <label className="label">Observação</label>
            <textarea {...register('observacao')} className="input h-16 resize-none" />
          </div>
          {mutation.isError && (
            <p className="text-sm text-red-500">{getApiError(mutation.error)}</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={isSubmitting || mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const statusBadge: Record<StatusAtividade, string> = {
  pendente: 'badge-pendente',
  aprovada: 'badge-aprovada',
  paga: 'badge-paga',
}

export default function Atividades() {
  const { canWrite, isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Atividade | undefined>()
  const [filterStatus, setFilterStatus] = useState<string>('')

  const { data = [], isLoading } = useQuery({
    queryKey: ['atividades', filterStatus],
    queryFn: () => atividadesApi.list(filterStatus ? { status: filterStatus } : undefined).then((r) => r.data),
  })

  const aprovarMutation = useMutation({
    mutationFn: (id: number) => atividadesApi.aprovar(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['atividades'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => atividadesApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['atividades'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }) },
  })

  function handleDelete(id: number) {
    if (!window.confirm('Excluir esta atividade?')) return
    deleteMutation.mutate(id)
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Atividades</h1>
          <p className="text-sm text-gray-500">{data.length} registro(s)</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input w-auto">
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="aprovada">Aprovada</option>
            <option value="paga">Paga</option>
          </select>
          {canWrite && (
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Nova Atividade
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="table-header">
              <th className="px-4 py-3 text-left">Instalador</th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">Obra</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Serviço</th>
              <th className="px-4 py-3 text-right hidden sm:table-cell">Qtd</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3 text-left">Data</th>
              <th className="px-4 py-3 text-left">Status</th>
              {canWrite && <th className="px-4 py-3 text-left">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Carregando...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Nenhuma atividade encontrada</td></tr>
            ) : (
              data.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{a.instalador_nome ?? `#${a.instalador_id}`}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-gray-600 dark:text-gray-400">{a.obra_cliente ?? `#${a.obra_id}`}</span>
                    {a.obra_numero_pedido && (
                      <span className="block font-mono text-[11px] text-gray-400 dark:text-gray-500">{a.obra_numero_pedido}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[150px] truncate hidden md:table-cell">{a.servico_descricao ?? `#${a.servico_id}`}</td>
                  <td className="px-4 py-3 text-right dark:text-gray-300 hidden sm:table-cell">{formatQuantidade(a.quantidade)} {a.servico_unidade ? UNIDADE_LABELS[a.servico_unidade] : ''}</td>
                  <td className="px-4 py-3 text-right font-medium dark:text-gray-200">{formatCurrency(a.valor_calculado)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatDate(a.data_execucao)}</td>
                  <td className="px-4 py-3">
                    <span className={statusBadge[a.status]}>{STATUS_ATIVIDADE_LABELS[a.status]}</span>
                  </td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {a.status === 'pendente' && (
                          <>
                            <button
                              onClick={() => aprovarMutation.mutate(a.id)}
                              disabled={aprovarMutation.isPending}
                              className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 font-medium"
                            >
                              <CheckCircle size={14} /> Aprovar
                            </button>
                            <button
                              onClick={() => setEditing(a)}
                              className="p-1 text-gray-400 hover:text-primary rounded"
                            >
                              <Pencil size={14} />
                            </button>
                          </>
                        )}
                        {(isAdmin || a.status === 'pendente') && (
                          <button
                            onClick={() => handleDelete(a.id)}
                            disabled={deleteMutation.isPending}
                            className="p-1 text-gray-400 hover:text-red-600 rounded"
                          >
                            <Trash2 size={14} />
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

      {showModal && <AtividadeModal onClose={() => setShowModal(false)} />}
      {editing && <EditAtividadeModal atividade={editing} onClose={() => setEditing(undefined)} />}
    </div>
  )
}
