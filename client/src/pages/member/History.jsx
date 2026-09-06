import PageHeader from '../../components/common/PageHeader'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'
import BorrowingCard from '../../components/borrowing/BorrowingCard'
import { useTranslation } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import borrowingService from '../../services/borrowingService'

const PAST_STATUSES = ['returned', 'rejected']

export default function MemberHistory() {
  const { t } = useTranslation()
  const { data, loading, error, reload } = useAsyncData(
    () => borrowingService.getMyBorrowings(),
    [],
  )

  const history = (data || []).filter((item) => PAST_STATUSES.includes(item.status))

  return (
    <div className="space-y-6">
      <PageHeader title={t('borrow.history')} />

      {loading && <Loading />}
      {!loading && error && (
        <ErrorState title={t('borrow.loadError')} error={error} onRetry={reload} />
      )}
      {!loading && !error && history.length === 0 && (
        <EmptyState icon="🕘" title={t('borrow.emptyHistory')} />
      )}
      {!loading && !error && history.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {history.map((borrowing) => (
            <BorrowingCard key={borrowing.id} borrowing={borrowing} />
          ))}
        </div>
      )}
    </div>
  )
}
