import { useState, useRef, useEffect, useMemo } from 'react'

interface AutocompleteProps<T extends { id: number }> {
  items: T[]
  value: number
  onChange: (id: number) => void
  error?: string
  placeholder: string
  getLabel: (item: T) => string
  renderOption: (item: T) => React.ReactNode
  filterFn: (item: T, query: string) => boolean
  renderInfo?: (item: T) => React.ReactNode
  onQueryChange?: (query: string) => void
}

export function Autocomplete<T extends { id: number }>({
  items,
  value,
  onChange,
  error,
  placeholder,
  getLabel,
  renderOption,
  filterFn,
  renderInfo,
  onQueryChange,
}: AutocompleteProps<T>) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const filterFnRef = useRef(filterFn)
  filterFnRef.current = filterFn

  const selected = items.find((i) => i.id === value)

  useEffect(() => {
    setQuery(selected ? getLabel(selected) : '')
  }, [selected]) // getLabel is stable in practice

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = useMemo(
    () => (query ? items.filter((i) => filterFnRef.current(i, query)) : items),
    [items, query],
  )

  function select(item: T) {
    onChange(item.id)
    setQuery(getLabel(item))
    setOpen(false)
  }

  function handleFocus() {
    setOpen(true)
    if (selected) setQuery('')
  }

  function handleBlur() {
    setTimeout(() => {
      if (!selected) {
        setQuery('')
        onChange(0)
      } else {
        setQuery(getLabel(selected))
      }
    }, 150)
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        className={`input ${error ? 'border-red-500' : ''}`}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          onQueryChange?.(e.target.value)
          if (!e.target.value) onChange(0)
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {selected && renderInfo && (
        <p className="text-xs text-gray-400 mt-1">{renderInfo(selected)}</p>
      )}
      {open && (
        <ul className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-gray-400">Nenhum resultado encontrado</li>
          ) : (
            filtered.map((item) => (
              <li
                key={item.id}
                onMouseDown={() => select(item)}
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-xl last:rounded-b-xl"
              >
                {renderOption(item)}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
