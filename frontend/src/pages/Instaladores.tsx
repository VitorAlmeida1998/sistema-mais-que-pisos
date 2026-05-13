import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { instaladoresApi } from '@/services/api'
import { formatCPF, getApiError } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import type { Instalador } from '@/types'

const schema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  cpf: z.string().min(11, 'CPF inválido').max(14),
  telefone: z.string().optional(),
  chave_pix: z.string().optional(),
  banco: z.string().optional(),
  agencia: z.string().optional(),
  conta: z.string().optional(),
  eh_mei: z.boolean().default(false),
  cnpj_mei: z.string().optional(),
  observacoes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

function InstaladorModal({
  instalador,
  onClose,
}: {
  instalador?: Instalador
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: instalador
      ? {
          nome: instalador.nome,
          cpf: instalador.cpf,
          telefone: instalador.telefone ?? '',
          chave_pix: instalador.chave_pix ?? '',
          banco: instalador.banco ?? '',
          agencia: instalador.agencia ?? '',
          conta: instalador.conta ?? '',
          eh_mei: instalador.eh_mei,
          cnpj_mei: instalador.cnpj_mei ?? '',
          observacoes: instalador.observacoes ?? '',
        }
      : { eh_mei: false },
  })

  const ehMei = watch('eh_mei')

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      instalador
        ? instaladoresApi.update(instalador.id, data)
        : instaladoresApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instaladores'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{instalador ? 'Editar Instalador' : 'Novo Instalador'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">&times;</button>
        </div>
        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div className="col-span-2">
            <label className="label">Nome *</label>
            <input {...register('nome')} className="input" />
            {errors.nome && <p className="text-xs text-red-600 mt-1">{errors.nome.message}</p>}
          </div>
          <div>
            <label className="label">CPF *</label>
            <input {...register('cpf')} className="input" placeholder="000.000.000-00" disabled={!!instalador} />
            {errors.cpf && <p className="text-xs text-red-600 mt-1">{errors.cpf.message}</p>}
          </div>
          <div>
            <label className="label">Telefone</label>
            <input {...register('telefone')} className="input" />
          </div>
          <div>
            <label className="label">Chave PIX</label>
            <input {...register('chave_pix')} className="input" />
          </div>
          <div>
            <label className="label">Banco</label>
            <input {...register('banco')} className="input" />
          </div>
          <div>
            <label className="label">Agência</label>
            <input {...register('agencia')} className="input" />
          </div>
          <div>
            <label className="label">Conta</label>
            <input {...register('conta')} className="input" />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" {...register('eh_mei')} id="eh_mei" className="rounded border-gray-300" />
            <label htmlFor="eh_mei" className="text-sm text-gray-700">É MEI</label>
          </div>
          {ehMei && (
            <div>
              <label className="label">CNPJ MEI</label>
              <input {...register('cnpj_mei')} className="input" />
            </div>
          )}
          <div className="col-span-2">
            <label className="label">Observações</label>
            <textarea {...register('observacoes')} className="input h-20 resize-none" />
          </div>

          {mutation.isError && (
            <div className="col-span-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded">
              {getApiError(mutation.error)}
            </div>
          )}

          <div className="col-span-2 flex justify-end gap-3 pt-2">
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

export default function Instaladores() {
  const { canWrite } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Instalador | undefined>()
  const [apenasAtivos, setApenasAtivos] = useState(true)

  const { data = [], isLoading } = useQuery({
    queryKey: ['instaladores', apenasAtivos],
    queryFn: () => instaladoresApi.list({ apenas_ativos: apenasAtivos }).then((r) => r.data),
  })

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Instaladores</h1>
          <p className="text-sm text-gray-500">{data.length} registro(s)</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={apenasAtivos}
              onChange={(e) => setApenasAtivos(e.target.checked)}
              className="rounded border-gray-300"
            />
            Apenas ativos
          </label>
          {canWrite && (
            <button onClick={() => { setEditing(undefined); setShowModal(true) }} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Novo Instalador
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="table-header">
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">CPF</th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">Telefone</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Chave PIX</th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">MEI</th>
              <th className="px-4 py-3 text-left">Status</th>
              {canWrite && <th className="px-4 py-3 text-left">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Carregando...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhum instalador encontrado</td></tr>
            ) : (
              data.map((inst) => (
                <tr key={inst.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{inst.nome}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatCPF(inst.cpf)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{inst.telefone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">{inst.chave_pix ?? '—'}</td>
                  <td className="px-4 py-3 dark:text-gray-300 hidden sm:table-cell">{inst.eh_mei ? 'Sim' : 'Não'}</td>
                  <td className="px-4 py-3">
                    <span className={inst.ativo ? 'badge-ativo' : 'badge-inativo'}>
                      {inst.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { setEditing(inst); setShowModal(true) }}
                        className="p-1 text-gray-400 hover:text-primary rounded"
                      >
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
      </div>

      {showModal && (
        <InstaladorModal
          instalador={editing}
          onClose={() => { setShowModal(false); setEditing(undefined) }}
        />
      )}
    </div>
  )
}
