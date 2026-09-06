import StatusBadge from '../common/StatusBadge'
import { useLanguage, useTranslation } from '../../context/LanguageContext'
import { formatDate } from '../../utils/format'

export default function BorrowingCard({ borrowing, actions }) {
  const { t } = useTranslation()
  const { language } = useLanguage()

  const rows = [
    { label: t('borrow.requestedOn'), value: formatDate(borrowing.requestedAt, language) },
    { label: t('borrow.borrowedDate'), value: formatDate(borrowing.borrowedAt, language) },
    { label: t('borrow.dueDate'), value: formatDate(borrowing.dueDate, language) },
    { label: t('borrow.returnedDate'), value: formatDate(borrowing.returnedAt, language) },
  ].filter((row) => row.value)

  return (
    <article className="card flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{borrowing.bookTitle}</h3>
          <p className="text-sm text-slate-600">{borrowing.bookAuthor}</p>
        </div>
        <StatusBadge status={borrowing.status} />
      </div>

      <dl className="grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex gap-1">
            <dt className="text-slate-500">{row.label}:</dt>
            <dd className="font-medium text-slate-800">{row.value}</dd>
          </div>
        ))}
      </dl>

      {borrowing.status === 'rejected' && borrowing.rejectionReason && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {t('notes.rejectionReasonLabel')}: {borrowing.rejectionReason}
        </p>
      )}

      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </article>
  )
}
