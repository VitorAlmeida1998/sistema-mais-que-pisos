import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, CheckCircle, Trash2, Pencil, ClipboardList, Download } from 'lucide-react'
import { exportToExcel } from '@/lib/excel'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { atividadesApi, instaladoresApi, obrasApi, servicosApi } from '@/services/api'
import { formatCurrency, formatDate, formatQuantidade, STATUS_ATIVIDADE_LABELS, UNIDADE_LABELS, getApiError } from '@/lib/utils'
import { useConfirm } from '@/hooks/useConfirm'
import { useAuth } from '@/hooks/useAuth'
import { usePagination } from '@/hooks/usePagination'
import { useResponsivePageSize } from '@/hooks/useResponsivePageSize'
import { Pagination } from '@/components/ui/Pagination'
import type { Atividade, Instalador, Obra, Servico, StatusAtividade } from '@/types'

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

// ── Autocomplete de obras ────────────────────────────────────────────────────

function ObraAutocomplete({
  obras,
  value,
  onChange,
  error,
}: {
  obras: Obra[]
  value: number
  onChange: (id: number) => void
  error?: string
}) {
  const [query, setQuery] = useState('')
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selecionada = obras.find((o) => o.id === value)

  useEffect(() => {
    if (selecionada) setQuery(selecionada.numero_pedido ?? selecionada.cliente_nome)
  }, [selecionada])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtradas = query.length === 0
    ? obras
    : obras.filter((o) => {
        const q = query.toLowerCase()
        return (o.numero_pedido ?? '').toLowerCase().includes(q) || o.cliente_nome.toLowerCase().includes(q)
      })

  function selecionar(o: Obra) {
    onChange(o.id)
    setQuery(o.numero_pedido ?? o.cliente_nome)
    setAberto(false)
  }

  function handleFocus() {
    setAberto(true)
    if (selecionada) setQuery('')
  }

  function handleBlur() {
    setTimeout(() => {
      if (!selecionada) { setQuery(''); onChange(0) }
      else setQuery(selecionada.numero_pedido ?? selecionada.cliente_nome)
    }, 150)
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        className={`input ${error ? 'border-red-500' : ''}`}
        placeholder="Nº do pedido ou nome do cliente..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); setAberto(true); if (!e.target.value) onChange(0) }}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {selecionada && (
        <p className="text-xs text-gray-400 mt-1">
          {selecionada.cliente_nome} · {selecionada.endereco}
        </p>
      )}
      {aberto && filtradas.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtradas.map((o) => (
            <li
              key={o.id}
              onMouseDown={() => selecionar(o)}
              className="flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-xl last:rounded-b-xl"
            >
              <span className="text-gray-800 dark:text-gray-200">{o.cliente_nome}</span>
              {o.numero_pedido && (
                <span className="text-xs font-mono text-gray-400 ml-3 flex-shrink-0">{o.numero_pedido}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {aberto && filtradas.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg px-4 py-3 text-sm text-gray-400">
          Nenhuma obra encontrada
        </div>
      )}
    </div>
  )
}

// ── Modal nova atividade ─────────────────────────────────────────────────────

function AtividadeModal({ instaladorPreSelecionado, onClose }: { instaladorPreSelecionado?: number; onClose: () => void }) {
  const queryClient = useQueryClient()

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
      toast.success(data.servicos.length > 1 ? `${data.servicos.length} atividades registradas` : 'Atividade registrada')
      onClose()
    } catch (err) {
      toast.error(getApiError(err))
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
              <Controller
                control={control}
                name="obra_id"
                render={({ field }) => (
                  <ObraAutocomplete
                    obras={obras}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.obra_id?.message}
                  />
                )}
              />
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atividades'] })
      toast.success('Atividade atualizada')
      onClose()
    },
    onError: (err) => toast.error(getApiError(err)),
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
  dataInicio,
  dataFim,
  canWrite,
  isAdmin,
}: {
  instalador: Instalador
  filterStatus: string
  dataInicio: string
  dataFim: string
  canWrite: boolean
  isAdmin: boolean
}) {
  const queryClient = useQueryClient()
  const { confirm, dialog: confirmDialog } = useConfirm()
  const [editing, setEditing] = useState<Atividade | undefined>()
  const pageSize = useResponsivePageSize()

  const { data = [], isLoading } = useQuery({
    queryKey: ['atividades', instalador.id, filterStatus, dataInicio, dataFim],
    queryFn: () =>
      atividadesApi.list({
        instalador_id: instalador.id,
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(dataInicio ? { data_inicio: dataInicio } : {}),
        ...(dataFim ? { data_fim: dataFim } : {}),
      }).then((r) => r.data),
  })

  const aprovarMutation = useMutation({
    mutationFn: (id: number) => atividadesApi.aprovar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atividades', instalador.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Atividade aprovada')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => atividadesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atividades', instalador.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Atividade excluída')
    },
    onError: (err) => toast.error(getApiError(err)),
  })

  async function handleDelete(id: number) {
    const ok = await confirm('Excluir esta atividade?', 'Esta ação não pode ser desfeita.')
    if (!ok) return
    deleteMutation.mutate(id)
  }

  const { page, setPage, paginated, total } = usePagination(data, pageSize)
  const totalValor = data.reduce((s, a) => s + parseFloat(a.valor_calculado), 0)

  return (
    <>
      {/* Resumo */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 mb-3">
        <div className="flex gap-4 text-sm text-gray-500">
          <span>{total} atividade(s)</span>
          {data.length > 0 && (
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              Total: {formatCurrency(totalValor)}
            </span>
          )}
        </div>
        {data.length > 0 && (
          <button
            onClick={() => exportToExcel(
              data.map((a) => ({
                Data: a.data_execucao,
                Obra: a.obra_cliente ?? '',
                'Nº Pedido': a.obra_numero_pedido ?? '',
                Serviço: a.servico_descricao ?? '',
                Quantidade: a.quantidade,
                Unidade: a.servico_unidade ?? '',
                Total: a.valor_calculado,
                Status: a.status,
              })),
              `atividades_${instalador.nome.replace(/\s+/g, '_')}`
            )}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary font-medium transition-colors"
          >
            <Download size={13} /> Exportar Excel
          </button>
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
                <TableSkeleton cols={canWrite ? 7 : 6} />
              ) : data.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="Nenhuma atividade encontrada"
                  description={filterStatus || dataInicio || dataFim ? 'Tente ajustar ou limpar os filtros.' : 'Registre a primeira atividade deste instalador.'}
                />
              ) : (
                paginated.map((a) => (
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
        <Pagination page={page} total={total} pageSize={pageSize} onChange={setPage} />
      </div>

      {editing && <EditAtividadeModal atividade={editing} onClose={() => setEditing(undefined)} />}
      {confirmDialog}
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
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

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

  useEffect(() => {
    if (abaAtiva === null) return
    document.getElementById(`tab-inst-${abaAtiva}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [abaAtiva])

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h1 className="text-2xl font-bold">Atividades</h1>
          {canWrite && (
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Nova Atividade
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="input flex-1 sm:w-auto text-sm"
              title="Data início"
            />
            <span className="text-gray-400 text-sm flex-shrink-0">—</span>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="input flex-1 sm:w-auto text-sm"
              title="Data fim"
            />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input w-full sm:w-auto text-sm">
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="aprovada">Aprovada</option>
            <option value="paga">Paga</option>
          </select>
          {(dataInicio || dataFim || filterStatus) && (
            <button
              onClick={() => { setDataInicio(''); setDataFim(''); setFilterStatus('') }}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline"
            >
              Limpar filtros
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
                id={`tab-inst-${inst.id}`}
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
          dataInicio={dataInicio}
          dataFim={dataFim}
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
