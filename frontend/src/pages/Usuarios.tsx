import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { usuariosApi } from '@/services/api'
import { formatDate, PAPEL_LABELS, getApiError } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import type { Usuario } from '@/types'

const createSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(8, 'Mínimo 8 caracteres'),
  papel: z.enum(['admin', 'gestor', 'visualizador']),
})
const updateSchema = z.object({
  nome: z.string().min(2).optional(),
  email: z.string().email().optional(),
  senha: z.string().min(8).optional().or(z.literal('')),
  papel: z.enum(['admin', 'gestor', 'visualizador']).optional(),
  ativo: z.boolean().optional(),
})
type CreateData = z.infer<typeof createSchema>
type UpdateData = z.infer<typeof updateSchema>

function UsuarioModal({ usuario, onClose }: { usuario?: Usuario; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(usuario ? updateSchema : createSchema),
    defaultValues: usuario
      ? { nome: usuario.nome, email: usuario.email, papel: usuario.papel, ativo: usuario.ativo, senha: '' }
      : { papel: 'visualizador' as const },
  })

  const mutation = useMutation({
    mutationFn: (data: CreateData | UpdateData) => {
      const payload = { ...data }
      if ('senha' in payload && !payload.senha) delete payload.senha
      return usuario ? usuariosApi.update(usuario.id, payload) : usuariosApi.create(payload)
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['usuarios'] }); onClose() },
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
        <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{usuario ? 'Editar Usuário' : 'Novo Usuário'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d as CreateData | UpdateData))} className="p-6 space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input {...register('nome')} className="input" />
            {errors.nome && <p className="text-xs text-red-600 mt-1">{errors.nome.message}</p>}
          </div>
          <div>
            <label className="label">E-mail *</label>
            <input {...register('email')} type="email" className="input" />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">{usuario ? 'Nova Senha (opcional)' : 'Senha *'}</label>
            <input {...register('senha')} type="password" className="input" placeholder={usuario ? 'Deixe em branco para manter' : ''} />
            {errors.senha && <p className="text-xs text-red-600 mt-1">{errors.senha.message}</p>}
          </div>
          <div>
            <label className="label">Papel *</label>
            <select {...register('papel')} className="input">
              <option value="visualizador">Visualizador</option>
              <option value="gestor">Gestor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          {usuario && (
            <div className="flex items-center gap-2">
              <input type="checkbox" {...register('ativo')} id="ativo_u" className="rounded border-gray-300" />
              <label htmlFor="ativo_u" className="text-sm text-gray-700">Ativo</label>
            </div>
          )}
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

export default function Usuarios() {
  const { isAdmin } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Usuario | undefined>()

  const { data = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => usuariosApi.list().then((r) => r.data),
  })

  if (!isAdmin) return <div className="text-center py-12 text-gray-500">Acesso restrito a administradores.</div>

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <button onClick={() => { setEditing(undefined); setShowModal(true) }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Novo Usuário
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="table-header">
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">E-mail</th>
              <th className="px-4 py-3 text-left">Papel</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">Criado em</th>
              <th className="px-4 py-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Carregando...</td></tr>
            ) : (
              data.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{u.nome}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{u.email}</td>
                  <td className="px-4 py-3 dark:text-gray-300">{PAPEL_LABELS[u.papel]}</td>
                  <td className="px-4 py-3">
                    <span className={u.ativo ? 'badge-ativo' : 'badge-inativo'}>{u.ativo ? 'Ativo' : 'Inativo'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">{formatDate(u.criado_em.slice(0, 10))}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setEditing(u); setShowModal(true) }} className="p-1 text-gray-400 hover:text-primary rounded">
                      <Pencil size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {showModal && <UsuarioModal usuario={editing} onClose={() => { setShowModal(false); setEditing(undefined) }} />}
    </div>
  )
}
