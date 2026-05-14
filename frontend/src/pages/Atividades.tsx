import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CheckCircle, Trash2, Pencil } from 'lucide-react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { atividadesApi, instaladoresApi, obrasApi, servicosApi } from '@/services/api'
import { formatCurrency, formatDate, formatQuantidade, STATUS_ATIVIDADE_LABELS, UNIDADE_LABELS, getApiError } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import type { Atividade, Instalador, Servico, StatusAtividade } from '@/types'

// ── Schemas ──────────────────────────────────────────────────────────────────

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

const editSchema = z.object({
  quantidade: z.coerce.number().positive('Quantidade deve ser positiva'),
  data_execucao: z.string().min(1, 'Data obrigatória'),
  observacao: z.string().optional(),
})
type EditFormData = z.infer<typeof editSchema>

// ── Autocomplete de serviços ─────────────────────────────────────────────────

function ServicoAutocomplete({
  servicos,
  value,
  onChange,
  error,
}: {
  servicos: Servico[]
  value: number
  onChange: (id: number) => void
  error?: string
}) {
  const [query, setQuery] = useState('')
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selecionado = servicos.find((s) => s.id === value)

  useEffect(() => {
    if (selecionado) setQuery(selecionado.descricao)
  }, [selecionado])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtrados = query.length === 0
    ? servicos
    : servicos.filter((s) => s.descricao.toLowerCase().includes(query.toLowerCase()))

  function selecionar(s: Servico) {
    onChange(s.id)
    setQuery(s.descricao)
    setAberto(false)
  }

  function handleFocus() {
    setAberto(true)
    if (selecionado) setQuery('')
  }

  function handleBlur() {
    setTimeout(() => {
      if (!selecionado) { setQuery(''); onChange(0) }
      else setQuery(selecionado.descricao)
    }, 150)
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        className={`input ${error ? 'border-red-500' : ''}`}
        placeholder="Digite para buscar serviço..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); setAberto(true); if (!e.target.value) onChange(0) }}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {selecionado && (
        <p className="text-xs text-gray-400 mt-1">
          {formatCurrency(selecionado.valor_unitario)} / {UNIDADE_LABELS[selecionado.unidade]}
        </p>
      )}
      {aberto && filtrados.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtrados.map((s) => (
            <li
              key={s.id}
              onMouseDown={() => selecionar(s)}
              className="flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-xl last:rounded-b-xl"
            >
              <span className="text-gray-800 dark:text-gray-200">{s.descricao}</span>
              <span className="text-xs text-gray-400 ml-3 flex-shrink-0">
                {formatCurrency(s.valor_unitario)}/{UNIDADE_LABELS[s.unidade]}
              </span>
            </li>
          ))}
        </ul>
      )}
      {aberto && filtrados.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg px-4 py-3 text-sm text-gray-400">
          Nenhum serviço encontrado
        </div>
      )}
    </div>
  )
}

// ── Modal nova atividade ─────────────────────────────────────────────────────

function AtividadeModal({ instaladorPreSelecionado, onClose }: { instaladorPreSelecionado?: number; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      instalador_id: instaladorPreSelecionado ?? 0,
      servicos: [{ servico_id: 0, quantidade: 0 }],
    },
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
            <div>
              <label className="label">Instalador *</label>
              <select {...register('instalador_id')} className="input" disabled={!!instaladorPreSelecionado}>
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
                        <button type="button" onClick={() => remove(index)} className="p-1 text-gray-400 hover:text-red-500 rounded-lg">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <Controller
                      control={control}
                      name={`servicos.${index}.servico_id`}
                      render={({ field }) => (
                        <ServicoAutocomplete
                          servicos={servicos}
                          value={field.value}
                          onChange={field.onChange}
                          error={errors.servicos?.[index]?.servico_id?.message}
                        />
                      )}
                    />
                    {errors.servicos?.[index]?.servico_id && (
                      <p className="text-xs text-red-500 mt-1">{errors.servicos[index].servico_id?.message}</p>
                    )}
                    <input
                      {...register(`servicos.${index}.quantidade`)}
                      type="number" step="0.001" placeholder="Quantidade" className="input"
                    />
                    {errors.servicos?.[index]?.quantidade && (
                      <p className="text-xs text-red-500 mt-1">{errors.servicos[index].quantidade?.message}</p>
                    )}
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
              {isSubmitting ? 'Salvando...' : fields.length > 1 ? `Salvar ${fields.length} serviços` : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal editar atividade ───────────────────────────────────────────────────

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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['atividades'] }); onClose() },
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
          {mutation.isError && <p className="text-sm text-red-500">{getApiError(mutation.error)}</p>}
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

// ── Tabela de atividades de um instalador ────────────────────────────────────

const statusBadge: Record<StatusAtividade, string> = {
  pendente: 'badge-pendente',
  aprovada: 'badge-aprovada',
  paga: 'badge-paga',
}

function TabelaAtividades({
  instalador,
  filterStatus,
  canWrite,
  isAdmin,
}: {
  instalador: Instalador
  filterStatus: string
  canWrite: boolean
  isAdmin: boolean
}) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Atividade | undefined>()

  const { data = [], isLoading } = useQuery({
    queryKey: ['atividades', instalador.id, filterStatus],
    queryFn: () =>
      atividadesApi.list({
        instalador_id: instalador.id,
        ...(filterStatus ? { status: filterStatus } : {}),
      }).then((r) => r.data),
  })

  const aprovarMutation = useMutation({
    mutationFn: (id: number) => atividadesApi.aprovar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atividades', instalador.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => atividadesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atividades', instalador.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  function handleDelete(id: number) {
    if (!window.confirm('Excluir esta atividade?')) return
    deleteMutation.mutate(id)
  }

  const totalValor = data.reduce((s, a) => s + parseFloat(a.valor_calculado), 0)

  return (
    <>
      {/* Resumo */}
      <div className="flex flex-wrap gap-4 px-1 mb-3 text-sm text-gray-500">
        <span>{data.length} atividade(s)</span>
        {data.length > 0 && (
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            Total: {formatCurrency(totalValor)}
          </span>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[580px]">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">Obra</th>
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
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Carregando...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhuma atividade encontrada</td></tr>
              ) : (
                data.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <span className="text-gray-700 dark:text-gray-300">{a.obra_cliente ?? `#${a.obra_id}`}</span>
                      {a.obra_numero_pedido && (
                        <span className="block font-mono text-[11px] text-gray-400">{a.obra_numero_pedido}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[150px] truncate hidden md:table-cell">
                      {a.servico_descricao ?? `#${a.servico_id}`}
                    </td>
                    <td className="px-4 py-3 text-right dark:text-gray-300 hidden sm:table-cell">
                      {formatQuantidade(a.quantidade)} {a.servico_unidade ? UNIDADE_LABELS[a.servico_unidade] : ''}
                    </td>
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
                              <button onClick={() => setEditing(a)} className="p-1 text-gray-400 hover:text-primary rounded">
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

      {editing && <EditAtividadeModal atividade={editing} onClose={() => setEditing(undefined)} />}
    </>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────

export default function Atividades() {
  const [searchParams] = useSearchParams()
  const instaladorParam = searchParams.get('instalador') ? Number(searchParams.get('instalador')) : null

  const { canWrite, isAdmin } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<number | null>(instaladorParam)
  const [filterStatus, setFilterStatus] = useState<string>('')

  const { data: instaladores = [], isLoading: loadingInstaladores } = useQuery({
    queryKey: ['instaladores', false],
    queryFn: () => instaladoresApi.list({ apenas_ativos: false }).then((r) => r.data),
  })

  const { data: todasAtividades = [] } = useQuery({
    queryKey: ['atividades', 'pendentes-count'],
    queryFn: () => atividadesApi.list({ status: 'pendente' }).then((r) => r.data),
  })

  const pendentePorInstalador = todasAtividades.reduce<Record<number, number>>((acc, a) => {
    acc[a.instalador_id] = (acc[a.instalador_id] ?? 0) + 1
    return acc
  }, {})

  const instaladorAtivo = instaladores.find((i) => i.id === abaAtiva) ?? instaladores[0] ?? null

  if (!loadingInstaladores && instaladores.length > 0 && abaAtiva === null) {
    setAbaAtiva(instaladores[0].id)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">Atividades</h1>
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

      {/* Abas de instaladores */}
      {loadingInstaladores ? (
        <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse mb-4" />
      ) : (
        <div className="flex gap-1 overflow-x-auto pb-1 mb-4 scrollbar-none">
          {instaladores.map((inst) => {
            const pendentes = pendentePorInstalador[inst.id] ?? 0
            const ativo = inst.id === abaAtiva
            return (
              <button
                key={inst.id}
                onClick={() => setAbaAtiva(inst.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                  ativo
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {inst.nome}
                {!inst.ativo && (
                  <span className="text-[10px] opacity-60">(inativo)</span>
                )}
                {pendentes > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                    ativo ? 'bg-white/30 text-white' : 'bg-amber-400 text-gray-900'
                  }`}>
                    {pendentes}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Conteúdo da aba ativa */}
      {instaladorAtivo && (
        <TabelaAtividades
          key={instaladorAtivo.id}
          instalador={instaladorAtivo}
          filterStatus={filterStatus}
          canWrite={canWrite}
          isAdmin={isAdmin}
        />
      )}

      {showModal && (
        <AtividadeModal
          instaladorPreSelecionado={abaAtiva ?? undefined}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
