import api from '@/lib/axios'
import type {
  Instalador, Obra, Servico, Atividade, Adiantamento, Pagamento,
  PagamentoPreview, DashboardData, DashboardMensalItem, Usuario, AuditLog
} from '@/types'

// Auth
export const authApi = {
  login: (email: string, senha: string) =>
    api.post<{ access_token: string; refresh_token: string }>('/auth/login', { email, senha }),
  me: () => api.get<Usuario>('/usuarios/me'),
}

// Dashboard
export const dashboardApi = {
  get: () => api.get<DashboardData>('/dashboard'),
  mensal: (meses = 6) => api.get<DashboardMensalItem[]>('/dashboard/mensal', { params: { meses } }),
}

// Instaladores
export const instaladoresApi = {
  list: (params?: { apenas_ativos?: boolean }) =>
    api.get<Instalador[]>('/instaladores', { params }),
  get: (id: number) => api.get<Instalador>(`/instaladores/${id}`),
  create: (data: unknown) => api.post<Instalador>('/instaladores', data),
  update: (id: number, data: unknown) => api.put<Instalador>(`/instaladores/${id}`, data),
  delete: (id: number) => api.delete(`/instaladores/${id}`),
}

// Obras
export const obrasApi = {
  list: (params?: { apenas_ativas?: boolean }) =>
    api.get<Obra[]>('/obras', { params }),
  get: (id: number) => api.get<Obra>(`/obras/${id}`),
  create: (data: unknown) => api.post<Obra>('/obras', data),
  update: (id: number, data: unknown) => api.put<Obra>(`/obras/${id}`, data),
  delete: (id: number) => api.delete(`/obras/${id}`),
}

// Serviços
export const servicosApi = {
  list: (params?: { apenas_ativos?: boolean }) =>
    api.get<Servico[]>('/servicos', { params }),
  get: (id: number) => api.get<Servico>(`/servicos/${id}`),
  create: (data: unknown) => api.post<Servico>('/servicos', data),
  update: (id: number, data: unknown) => api.put<Servico>(`/servicos/${id}`, data),
  delete: (id: number) => api.delete(`/servicos/${id}`),
}

// Atividades
export const atividadesApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Atividade[]>('/atividades', { params }),
  get: (id: number) => api.get<Atividade>(`/atividades/${id}`),
  create: (data: unknown) => api.post<Atividade>('/atividades', data),
  update: (id: number, data: unknown) => api.put<Atividade>(`/atividades/${id}`, data),
  aprovar: (id: number) => api.post<Atividade>(`/atividades/${id}/aprovar`),
  delete: (id: number) => api.delete(`/atividades/${id}`),
}

// Adiantamentos
export const adiantamentosApi = {
  list: (params?: { instalador_id?: number }) =>
    api.get<Adiantamento[]>('/adiantamentos', { params }),
  create: (data: unknown) => api.post<Adiantamento>('/adiantamentos', data),
}

// Pagamentos
export const pagamentosApi = {
  preview: (data: unknown) => api.post<PagamentoPreview>('/pagamentos/preview', data),
  efetivar: (data: unknown) => api.post<Pagamento>('/pagamentos', data),
  list: () => api.get<Pagamento[]>('/pagamentos'),
  recibo: (id: number) => api.get(`/pagamentos/${id}/recibo`, { responseType: 'blob' }),
}

// Relatórios
export const relatoriosApi = {
  semanal: (inicio: string, fim: string) =>
    api.get('/relatorios/semanal', { params: { inicio, fim } }),
}

// Usuários
export const usuariosApi = {
  list: () => api.get<Usuario[]>('/usuarios'),
  get: (id: number) => api.get<Usuario>(`/usuarios/${id}`),
  create: (data: unknown) => api.post<Usuario>('/usuarios', data),
  update: (id: number, data: unknown) => api.put<Usuario>(`/usuarios/${id}`, data),
}

// Audit log
export const auditLogApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<AuditLog[]>('/audit-log', { params }),
}
