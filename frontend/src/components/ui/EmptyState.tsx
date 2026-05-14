export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description?: string
}) {
  return (
    <tr>
      <td colSpan={100}>
        <div className="flex flex-col items-center justify-center py-14 text-center px-4">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Icon size={26} className="text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">{title}</p>
          {description && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs">{description}</p>
          )}
        </div>
      </td>
    </tr>
  )
}
