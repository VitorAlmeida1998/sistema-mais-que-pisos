import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface Props {
  page: number
  total: number
  pageSize: number
  onChange: (page: number) => void
}

export function Pagination({ page, total, pageSize, onChange }: Props) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  const btn = (label: React.ReactNode, target: number, disabled: boolean) => (
    <button
      onClick={() => onChange(target)}
      disabled={disabled}
      className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {label}
    </button>
  )

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 text-sm">
      <span className="text-gray-500 dark:text-gray-400">
        {start}–{end} de {total}
      </span>
      <div className="flex items-center gap-0.5">
        {btn(<ChevronsLeft size={15} />, 1, page === 1)}
        {btn(<ChevronLeft size={15} />, page - 1, page === 1)}
        <span className="px-3 text-gray-600 dark:text-gray-300 text-xs font-medium">
          {page} / {totalPages}
        </span>
        {btn(<ChevronRight size={15} />, page + 1, page === totalPages)}
        {btn(<ChevronsRight size={15} />, totalPages, page === totalPages)}
      </div>
    </div>
  )
}
