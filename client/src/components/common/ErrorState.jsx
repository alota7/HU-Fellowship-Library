import { useTranslation } from '../../context/LanguageContext'
import Button from './Button'

export default function ErrorState({ title, error, onRetry }) {
  const { t } = useTranslation()
  const message = title || t(error?.messageKey || 'error.generic')

  return (
    <div
      role="alert"
      className="card flex flex-col items-center justify-center gap-3 border-red-200 bg-red-50 px-6 py-12 text-center"
    >
      <span aria-hidden="true" className="text-3xl">
        ⚠️
      </span>
      <p className="text-base font-semibold text-red-800">{message}</p>
      {error?.messageKey && title && (
        <p className="text-sm text-red-700">{t(error.messageKey)}</p>
      )}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {t('action.retry')}
        </Button>
      )}
    </div>
  )
}
