import { useState, useEffect } from 'react'

export function usePagination<T>(data: T[], pageSize = 20) {
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [data.length, pageSize])

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = data.slice((safePage - 1) * pageSize, safePage * pageSize)

  return { page: safePage, setPage, paginated, total: data.length, totalPages }
}
