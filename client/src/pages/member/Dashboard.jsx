import PageHeader from '../../components/common/PageHeader'
import StatCard from '../../components/common/StatCard'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'
import BorrowingCard from '../../components/borrowing/BorrowingCard'
import { useTranslation } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import dashboardService from '../../services/dashboardService'

export default function MemberDashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data, loading, error, reload } = useAsyncData(
    () => dashboardService.getMemberDashboard(),
    [],
  )

  const stats = data?.stats
  const cards = [
    {
      label: t('dashboard.availableBooks'),
      value: stats?.availableBooks ?? 0,
      icon: '📚',
      to: '/books',
    },
    {
      label: t('dashboard.myBorrowings'),
      value: stats?.myBorrowings ?? 0,
      icon: '🔖',
      to: '/member/borrowings',
    },
    {
      label: t('dashboard.pendingRequests'),
      value: stats?.pendingRequests ?? 0,
      icon: '⏳',
      to: '/member/borrowings',
    },
    {
      label: t('dashboard.studyNotes'),
      value: stats?.studyNotes ?? 0,
      icon: '📖',
      to: '/summer-bible-study-notes',
    },
    {
      label: t('dashboard.personalNotes'),
      value: stats?.personalNotes ?? 0,
      icon: '📝',
      to: '/member/personal-study-notes',
    },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('dashboard.memberTitle')}
        subtitle={`${t('dashboard.welcome')}, ${user?.fullName || ''}`}
      />

      {loading && <Loading />}
      {!loading && error && (
        <ErrorState title={t('dashboard.loadError')} error={error} onRetry={reload} />
      )}

      {!loading && !error && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {cards.map((card) => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              {t('dashboard.recentActivity')}
            </h2>
            {data?.recentActivity?.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {data.recentActivity.map((borrowing) => (
                  <BorrowingCard key={borrowing.id} borrowing={borrowing} />
                ))}
              </div>
            ) : (
              <EmptyState icon="🕘" title={t('dashboard.noActivity')} />
            )}
          </section>
        </>
      )}
    </div>
  )
}
