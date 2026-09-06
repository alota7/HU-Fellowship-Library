import { useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'
import Button from '../../components/common/Button'
import BorrowingCard from '../../components/borrowing/BorrowingCard'
import { useTranslation } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import borrowingService from '../../services/borrowingService'

const CURRENT_STATUSES = ['pending', 'approved', 'borrowed', 'overdue']

export default function MemberBorrowings() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data, loading, error, reload } = useAsyncData(
    () => borrowingService.getMyBorrowings(),
    [],
  )
  const [pendingId, setPendingId] = useState(null)

  const current = (data || []).filter((item) => CURRENT_STATUSES.includes(item.status))

  async function requestReturn(id) {
    setPendingId(id)
    try {
      await borrowingService.requestReturn(id)
      toast.success(t('borrow.returnRequested'))
      await reload()
    } catch (actionError) {
      toast.error(t(actionError?.messageKey || 'borrow.actionError'))
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('borrow.myBorrowings')} />

      {loading && <Loading />}
      {!loading && error && (
        <ErrorState title={t('borrow.loadError')} error={error} onRetry={reload} />
      )}
      {!loading && !error && current.length === 0 && (
        <EmptyState icon="🔖" title={t('borrow.emptyCurrent')} />
      )}
      {!loading && !error && current.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {current.map((borrowing) => (
            <BorrowingCard
              key={borrowing.id}
              borrowing={borrowing}
              actions={
                ['borrowed', 'overdue'].includes(borrowing.status) &&
                !borrowing.returnRequested && (
                  <Button
                    variant="secondary"
                    onClick={() => requestReturn(borrowing.id)}
                    loading={pendingId === borrowing.id}
                    loadingLabel={t('status.processing')}
                  >
                    {t('borrow.requestReturn')}
                  </Button>
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
