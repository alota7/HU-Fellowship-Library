import { useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import RejectDialog from '../../components/common/RejectDialog'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'
import BorrowingCard from '../../components/borrowing/BorrowingCard'
import { useLanguage, useTranslation } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useBooks } from '../../context/BooksContext'
import borrowingService from '../../services/borrowingService'
import { formatDate } from '../../utils/format'

export default function AdminRequests() {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const toast = useToast()
  const { refresh: refreshBooks } = useBooks()
  const { data, loading, error, reload } = useAsyncData(() => borrowingService.getBorrowings(), [])

  const [toApprove, setToApprove] = useState(null)
  const [toReject, setToReject] = useState(null)
  const [details, setDetails] = useState(null)
  const [working, setWorking] = useState(false)

  const requests = (data || []).filter((item) => item.status === 'pending')

  async function runAction(action) {
    setWorking(true)
    try {
      await action()
      await Promise.all([reload(), refreshBooks()])
    } catch (actionError) {
      toast.error(t(actionError?.messageKey || 'borrow.actionError'))
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('borrow.requestsTitle')} />

      {loading && <Loading />}
      {!loading && error && (
        <ErrorState title={t('borrow.loadError')} error={error} onRetry={reload} />
      )}
      {!loading && !error && requests.length === 0 && (
        <EmptyState icon="📥" title={t('borrow.emptyRequests')} />
      )}
      {!loading && !error && requests.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {requests.map((request) => (
            <BorrowingCard
              key={request.id}
              borrowing={request}
              actions={
                <>
                  <Button variant="success" size="sm" onClick={() => setToApprove(request)}>
                    {t('action.approve')}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setToReject(request)}>
                    {t('action.reject')}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setDetails(request)}>
                    {t('action.viewDetails')}
                  </Button>
                </>
              }
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toApprove)}
        variant="success"
        title={t('borrow.approveTitle')}
        description={t('borrow.approveText')}
        confirmLabel={t('action.approve')}
        loading={working}
        onCancel={() => setToApprove(null)}
        onConfirm={() =>
          runAction(async () => {
            await borrowingService.approve(toApprove.id)
            toast.success(t('borrow.approved'))
            setToApprove(null)
          })
        }
      />

      <RejectDialog
        open={Boolean(toReject)}
        title={t('borrow.rejectTitle')}
        loading={working}
        onCancel={() => setToReject(null)}
        onConfirm={(reason) =>
          runAction(async () => {
            await borrowingService.reject(toReject.id, reason)
            toast.success(t('borrow.rejected'))
            setToReject(null)
          })
        }
      />

      <Modal open={Boolean(details)} title={t('ui.details')} onClose={() => setDetails(null)}>
        {details && (
          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              { label: t('borrow.book'), value: details.bookTitle },
              { label: t('borrow.member'), value: details.memberName },
              { label: t('auth.email'), value: details.memberEmail },
              { label: t('borrow.phone'), value: details.phone },
              { label: t('borrow.schoolYear'), value: details.schoolYear },
              { label: t('borrow.department'), value: details.department },
              { label: t('borrow.requestedOn'), value: formatDate(details.requestedAt, language) },
            ].map((row) => (
              <div key={row.label} className="rounded-lg bg-slate-50 px-3 py-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {row.label}
                </dt>
                <dd className="text-sm font-medium text-slate-800">
                  {row.value || t('ui.notProvided')}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>
    </div>
  )
}
