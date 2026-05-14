import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return cpf
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function formatQuantidade(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return num % 1 === 0 ? num.toFixed(0) : num.toString().replace('.', ',')
}

export const UNIDADE_LABELS: Record<string, string> = {
  m2: 'm²',
  unidade: 'unidade',
  diaria: 'diária',
  metro_linear: 'm linear',
}

export const STATUS_OBRA_LABELS: Record<string, string> = {
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

export const STATUS_ATIVIDADE_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  paga: 'Paga',
}

export const PAPEL_LABELS: Record<string, string> = {
  admin: 'Administrador',
  gestor: 'Gestor',
  visualizador: 'Visualizador',
}

export function getApiError(error: unknown, fallback = 'Erro ao salvar'): string {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  )
}
