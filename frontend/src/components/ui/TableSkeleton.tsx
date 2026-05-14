const WIDTHS = ['45%', '70%', '55%', '35%', '60%', '40%', '50%', '30%']

export function TableSkeleton({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div
                className="h-3.5 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"
                style={{ width: WIDTHS[j % WIDTHS.length] }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
