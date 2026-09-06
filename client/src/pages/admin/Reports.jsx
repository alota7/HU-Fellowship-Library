import { useMemo } from 'react'
import PageHeader from '../../components/common/PageHeader'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'
import { useTranslation } from '../../context/LanguageContext'
import { useBooks } from '../../context/BooksContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import borrowingService from '../../services/borrowingService'
import studyNoteService from '../../services/studyNoteService'
import { BORROWING_STATUSES, NOTE_STATUSES, BOOK_TYPES } from '../../models'

function countBy(items, key) {
  return items.reduce((totals, item) => {
    const value = item[key] || ''
    return { ...totals, [value]: (totals[value] || 0) + 1 }
  }, {})
}

function ReportTable({ title, rows }) {
  return (
    <section className="card p-5">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <dl className="mt-4 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-slate-600">{row.label}</dt>
            <dd className="font-semibold text-slate-900">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export default function AdminReports() {
  const { t } = useTranslation()
  const { books, loading: booksLoading, error: booksError, refresh } = useBooks()
  const {
    data: borrowings,
    loading: borrowingsLoading,
    error: borrowingsError,
    reload,
  } = useAsyncData(() => borrowingService.getBorrowings(), [])
  const { data: notes } = useAsyncData(() => studyNoteService.getPersonalNotes(), [])

  const byCategory = useMemo(() => countBy(books, 'category'), [books])

  const loading = booksLoading || borrowingsLoading
  const error = booksError || borrowingsError

  if (loading) return <Loading />
  if (error) {
    return (
      <ErrorState
        title={t('books.loadError')}
        error={error}
        onRetry={() => {
          refresh()
          reload()
        }}
      />
    )
  }

  const hasData = books.length > 0 || (borrowings || []).length > 0 || (notes || []).length > 0

  return (
    <div className="space-y-6">
      <PageHeader title={t('reports.title')} subtitle={t('reports.subtitle')} />

      {!hasData ? (
        <EmptyState icon="📈" title={t('reports.empty')} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <ReportTable
            title={t('reports.booksByType')}
            rows={BOOK_TYPES.map((type) => ({
              label: t(`books.${type}`),
              value: books.filter((book) => book.bookType === type).length,
            }))}
          />
          <ReportTable
            title={t('reports.borrowingsByStatus')}
            rows={BORROWING_STATUSES.map((status) => ({
              label: t(`status.${status}`),
              value: (borrowings || []).filter((item) => item.status === status).length,
            }))}
          />
          <ReportTable
            title={t('reports.notesByStatus')}
            rows={NOTE_STATUSES.map((status) => ({
              label: t(`status.${status}`),
              value: (notes || []).filter((item) => item.status === status).length,
            }))}
          />
          <ReportTable
            title={t('reports.booksByCategory')}
            rows={Object.entries(byCategory).map(([label, value]) => ({
              label: label || t('ui.notProvided'),
              value,
            }))}
          />
        </div>
      )}
    </div>
  )
}
