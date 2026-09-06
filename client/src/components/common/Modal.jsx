import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '../../context/LanguageContext'

export default function Modal({ open, title, onClose, children, footer, size = 'md' }) {
  const { t } = useTranslation()
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
      if (event.key !== 'Tab') return

      const focusable = panelRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable?.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    panelRef.current?.querySelector('button, input, select, textarea, a[href]')?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const width = size === 'lg' ? 'max-w-3xl' : size === 'sm' ? 'max-w-md' : 'max-w-xl'

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={panelRef}
        className={`max-h-[92vh] w-full ${width} overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl`}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('action.close')}
            className="rounded-lg border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
        {footer && <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
