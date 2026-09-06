import { useMemo, useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import SearchInput from '../../components/common/SearchInput'
import { Select } from '../../components/common/Input'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'
import BorrowingCard from '../../components/borrowing/BorrowingCard'
import { useTranslation } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useBooks } from '../../context/BooksContext'
import borrowingService from '../../services/borrowingService'
import { BORROWING_STATUSES } from '../../models'

export default function AdminBorrowings() {
  const { t } = useTranslation()
  const toast = useToast()
  const { refresh: refreshBooks } = useBooks()
  const { data, loading, error, reload } = useAsyncData(() => borrowingService.getBorrowings(), [])

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [toReturn, setToReturn] = useState(null)
  const [working, setWorking] = useState(false)

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase()
    return (data || []).filter((item) => {
      if (status && item.status !== status) return false
      if (!term) return true
      return [item.bookTitle, item.memberName, item.memberEmail].some((value) =>
        value?.toLowerCase().includes(term),
      )
    })
  }, [data, query, status])

  async function markReturned() {
    setWorking(true)
    try {
      await borrowingService.markReturned(toReturn.id)
      toast.success(t('borrow.markedReturned'))
      setToReturn(null)
      await Promise.all([reload(), refreshBooks()])
    } catch (actionError) {
      toast.error(t(actionError?.messageKey || 'borrow.actionError'))
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('borrow.allBorrowings')} />

      <div className="grid gap-3 sm:grid-cols-2">
        <SearchInput value={query} onChange={setQuery} />
        <Select
          label={t('ui.status')}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={[
            { value: '', label: t('ui.all') },
            ...BORROWING_STATUSES.map((value) => ({ value, label: t(`status.${value}`) })),
          ]}
        />
      </div>

      {loading && <Loading />}
      {!loading && error && (
        <ErrorState title={t('borrow.loadError')} error={error} onRetry={reload} />
      )}
      {!loading && !error && rows.length === 0 && (
        <EmptyState icon="🔖" title={t('borrow.emptyCurrent')} />
      )}
      {!loading && !error && rows.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((borrowing) => (
            <BorrowingCard
              key={borrowing.id}
              borrowing={borrowing}
              actions={
                ['borrowed', 'overdue'].includes(borrowing.status) && (
                  <Button variant="secondary" size="sm" onClick={() => setToReturn(borrowing)}>
                    {t('borrow.markReturned')}
                  </Button>
                )
              }
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toReturn)}
        variant="success"
        title={t('borrow.markReturned')}
        description={toReturn?.bookTitle}
        confirmLabel={t('action.confirm')}
        loading={working}
        onConfirm={markReturned}
        onCancel={() => setToReturn(null)}
      />
    </div>
  )
}
