import { useTranslation } from '../../context/LanguageContext'
import Button from './Button'

export default function Pagination({ page, pageCount, onChange }) {
  const { t } = useTranslation()
  if (pageCount <= 1) return null

  return (
    <nav className="mt-6 flex items-center justify-center gap-3" aria-label={t('ui.pagination.page')}>
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        {t('ui.pagination.previous')}
      </Button>
      <span className="text-sm text-slate-600">
        {t('ui.pagination.page')} {page} {t('ui.pagination.of')} {pageCount}
      </span>
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
      >
        {t('ui.pagination.next')}
      </Button>
    </nav>
  )
}
