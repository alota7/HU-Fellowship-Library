const VARIANTS = {
  success: 'bg-emerald-600',
  error: 'bg-red-600',
  warning: 'bg-amber-600',
}

const ICONS = { success: '✓', error: '✕', warning: '!' }

export default function ToastList({ toasts, onDismiss }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${VARIANTS[toast.variant]}`}
        >
          <span aria-hidden="true">{ICONS[toast.variant]}</span>
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="rounded p-1 text-white/80 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
