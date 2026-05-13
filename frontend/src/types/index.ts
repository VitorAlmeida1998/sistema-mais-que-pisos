export type Papel = 'admin' | 'gestor' | 'visualizador'
export type StatusAtividade = 'pendente' | 'aprovada' | 'paga'
export type StatusObra = 'em_andamento' | 'concluida' | 'cancelada'
export type UnidadeServico = 'm2' | 'unidade' | 'diaria' | 'metro_linear'

export interface Usuario {
  id: number
  nome: string
  email: string
  papel: Papel
  ativo: boolean
  criado_em: string
}

export interface Instalador {
  id: number
  nome: string
  cpf: string
  telefone: string | null
  chave_pix: string | null
  banco: string | null
  agencia: string | null
  conta: string | null
  eh_mei: boolean
  cnpj_mei: string | null
  ativo: boolean
  observacoes: string | null
  criado_em: string
}

export interface Obra {
  id: number
  cliente_nome: string
  endereco: string
  data_inicio: string
  data_fim_prevista: string | null
  status: StatusObra
  ativo: boolean
  observacoes: string | null
  criado_em: string
}

export interface Servico {
  id: number
  descricao: string
  unidade: UnidadeServico
  valor_unitario: string
  ativo: boolean
  criado_em: string
}

export interface Atividade {
  id: number
  instalador_id: number
  obra_id: number
  servico_id: number
  quantidade: string
  data_execucao: string
  valor_calculado: string
  status: StatusAtividade
  aprovador_id: number | null
  observacao: string | null
  pagamento_id: number | null
  criado_em: string
  instalador_nome?: string
  obra_cliente?: string
  servico_descricao?: string
  servico_unidade?: string
}

export interface Adiantamento {
  id: number
  instalador_id: number
  valor: string
  data: string
  descricao: string | null
  pagamento_id: number | null
  criado_por: number
  criado_em: string
  instalador_nome?: string
}

export interface Pagamento {
  id: number
  instalador_id: number
  semana_inicio: string
  semana_fim: string
  valor_bruto: string
  valor_adiantamentos: string
  valor_liquido: string
  data_pagamento: string | null
  comprovante_pdf_path: string | null
  criado_por: number
  criado_em: string
  instalador_nome?: string
}

export interface PagamentoPreview {
  instalador_id: number
  instalador_nome: string
  semana_inicio: string
  semana_fim: string
  atividades: Atividade[]
  adiantamentos_pendentes: Adiantamento[]
  valor_bruto: string
  valor_adiantamentos: string
  valor_liquido: string
}

export interface DashboardData {
  instaladores_ativos: number
  obras_em_andamento: number
  atividades_pendentes_aprovacao: number
  valor_previsto_pagamento: string
}

export interface DashboardMensalItem {
  mes: string
  label: string
  valor_pago: string
  valor_adiantamentos: string
  qtd_pagamentos: number
}

export interface AuditLog {
  id: number
  usuario_id: number | null
  acao: string
  entidade: string
  entidade_id: number | null
  dados_antes: Record<string, unknown> | null
  dados_depois: Record<string, unknown> | null
  timestamp: string
}

export interface ApiError {
  error: boolean
  message: string
  details: { field: string; message: string }[] | null
}
