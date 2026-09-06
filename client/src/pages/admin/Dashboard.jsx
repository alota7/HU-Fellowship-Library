import PageHeader from '../../components/common/PageHeader'
import StatCard from '../../components/common/StatCard'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'
import BorrowingCard from '../../components/borrowing/BorrowingCard'
import { useTranslation } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import dashboardService from '../../services/dashboardService'

export default function AdminDashboard() {
  const { t } = useTranslation()
  const { data, loading, error, reload } = useAsyncData(
    () => dashboardService.getAdminDashboard(),
    [],
  )

  const stats = data?.stats
  const cards = [
    { label: t('dashboard.totalBooks'), value: stats?.totalBooks ?? 0, icon: '📚', to: '/admin/books' },
    { label: t('dashboard.availableBooks'), value: stats?.availableBooks ?? 0, icon: '✅' },
    { label: t('dashboard.borrowedBooks'), value: stats?.borrowedBooks ?? 0, icon: '🔖', to: '/admin/borrowings' },
    { label: t('dashboard.pendingRequests'), value: stats?.pendingRequests ?? 0, icon: '⏳', to: '/admin/requests' },
    { label: t('dashboard.totalMembers'), value: stats?.totalMembers ?? 0, icon: '👥', to: '/admin/members' },
    { label: t('dashboard.studyNotes'), value: stats?.studyNotes ?? 0, icon: '📖', to: '/admin/summer-study-notes' },
    {
      label: t('dashboard.pendingPersonalNotes'),
      value: stats?.pendingPersonalNotes ?? 0,
      icon: '📝',
      to: '/admin/personal-study-notes',
    },
  ]

  return (
    <div className="space-y-8">
      <PageHeader title={t('dashboard.adminTitle')} />

      {loading && <Loading />}
      {!loading && error && (
        <ErrorState title={t('dashboard.loadError')} error={error} onRetry={reload} />
      )}

      {!loading && !error && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
