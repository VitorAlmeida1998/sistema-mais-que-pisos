import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ScrollText } from 'lucide-react'
import { auditLogApi } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { useResponsivePageSize } from '@/hooks/useResponsivePageSize'

export default function AuditLogPage() {
  const { isAdmin } = useAuth()
  const [entidade, setEntidade] = useState('')
  const [acao, setAcao] = useState('')

  const { data = [], isLoading } = useQuery({
    queryKey: ['audit-log', entidade, acao],
    queryFn: () =>
      auditLogApi.list({ entidade: entidade || undefined, acao: acao || undefined }).then((r) => r.data),
  })

  const pageSize = useResponsivePageSize()
  const { page, setPage, paginated, total } = usePagination(data, pageSize)

  if (!isAdmin) return <div className="text-center py-12 text-gray-500">Acesso restrito a administradores.</div>

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-gray-500">{total} registro(s)</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={entidade} onChange={(e) => setEntidade(e.target.value)} className="input w-auto">
            <option value="">Todas as entidades</option>
            <option value="atividades">Atividades</option>
            <option value="adiantamentos">Adiantamentos</option>
            <option value="pagamentos">Pagamentos</option>
          </select>
          <select value={acao} onChange={(e) => setAcao(e.target.value)} className="input w-auto">
            <option value="">Todas as ações</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">Timestamp</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Usuário ID</th>
                <th className="px-4 py-3 text-left">Ação</th>
                <th className="px-4 py-3 text-left">Entidade</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">ID</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Dados Depois</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {isLoading ? (
                <TableSkeleton cols={6} />
              ) : data.length === 0 ? (
                <EmptyState
                  icon={ScrollText}
                  title="Nenhum registro encontrado"
                  description="Alterações em atividades, adiantamentos e pagamentos aparecem aqui."
                />
              ) : (
                paginated.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{log.usuario_id ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={
                        log.acao === 'CREATE' ? 'badge-paga' :
                        log.acao === 'UPDATE' ? 'badge-aprovada' :
                        'badge-inativo'
                      }>
                        {log.acao}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium dark:text-gray-200">{log.entidade}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{log.entidade_id ?? '—'}</td>
                    <td className="px-4 py-3 max-w-xs hidden md:table-cell">
                      {log.dados_depois ? (
                        <code className="text-xs text-gray-500 block truncate">
                          {JSON.stringify(log.dados_depois).slice(0, 80)}…
                        </code>
                      ) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} pageSize={pageSize} onChange={setPage} />
      </div>
    </div>
  )
}
