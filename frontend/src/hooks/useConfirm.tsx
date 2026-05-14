import { useState } from 'react'

interface ConfirmState {
  message: string
  description?: string
  confirmLabel: string
  resolve: (value: boolean) => void
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null)

  function confirm(message: string, description?: string, confirmLabel = 'Excluir'): Promise<boolean> {
    return new Promise((resolve) => {
      setState({ message, description, confirmLabel, resolve })
    })
  }

  function handleConfirm() {
    state?.resolve(true)
    setState(null)
  }

  function handleCancel() {
    state?.resolve(false)
    setState(null)
  }

  const dialog = state ? (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleCancel}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{state.message}</h3>
          {state.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{state.description}</p>
          )}
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button onClick={handleCancel} className="btn-secondary">Cancelar</button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return { confirm, dialog }
}
