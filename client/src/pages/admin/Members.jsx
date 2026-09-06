import { useMemo, useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import SearchInput from '../../components/common/SearchInput'
import { Select } from '../../components/common/Input'
import Modal from '../../components/common/Modal'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import Loading from '../../components/common/Loading'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'
import StatusBadge from '../../components/common/StatusBadge'
import { useLanguage, useTranslation } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import userService from '../../services/userService'
import { formatDate } from '../../utils/format'

export default function AdminMembers() {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const toast = useToast()
  const { data, loading, error, reload } = useAsyncData(() => userService.getUsers(), [])

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [details, setDetails] = useState(null)
  const [toToggle, setToToggle] = useState(null)
  const [working, setWorking] = useState(false)

  const members = useMemo(() => {
    const term = query.trim().toLowerCase()
    return (data || []).filter((user) => {
      if (status && user.status !== status) return false
      if (!term) return true
      return [user.fullName, user.email].some((value) => value?.toLowerCase().includes(term))
    })
  }, [data, query, status])

  async function toggleStatus() {
    setWorking(true)
    try {
      await userService.updateStatus(
        toToggle.id,
        toToggle.status === 'active' ? 'inactive' : 'active',
      )
      toast.success(t('members.statusUpdated'))
      setToToggle(null)
      await reload()
    } catch (actionError) {
      toast.error(t(actionError?.messageKey || 'members.statusError'))
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('members.title')} />

      <div className="grid gap-3 sm:grid-cols-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t('members.searchPlaceholder')}
        />
        <Select
          label={t('ui.status')}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={[
            { value: '', label: t('members.allStatuses') },
            { value: 'active', label: t('status.active') },
            { value: 'inactive', label: t('status.inactive') },
          ]}
        />
      </div>

      {loading && <Loading />}
      {!loading && error && (
        <ErrorState title={t('members.loadError')} error={error} onRetry={reload} />
      )}
      {!loading && !error && members.length === 0 && (
        <EmptyState icon="👥" title={t('members.empty')} />
      )}

      {!loading && !error && members.length > 0 && (
        <>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">{t('members.title')}</caption>
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-3 py-2">
                    {t('auth.fullName')}
                  </th>
                  <th scope="col" className="px-3 py-2">
                    {t('auth.email')}
                  </th>
                  <th scope="col" className="px-3 py-2">
                    {t('auth.department')}
                  </th>
                  <th scope="col" className="px-3 py-2">
                    {t('ui.status')}
                  </th>
                  <th scope="col" className="px-3 py-2">
                    {t('ui.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-medium text-slate-800">{member.fullName}</td>
                    <td className="px-3 py-3 text-slate-600">{member.email}</td>
                    <td className="px-3 py-3 text-slate-600">{member.department}</td>
                    <td className="px-3 py-3">
                      <StatusBadge status={member.status} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setDetails(member)}>
                          {t('action.viewDetails')}
                        </Button>
                        <Button
                          variant={member.status === 'active' ? 'danger' : 'success'}
                          size="sm"
                          onClick={() => setToToggle(member)}
                        >
                          {t(member.status === 'active' ? 'action.deactivate' : 'action.activate')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="grid gap-4 lg:hidden">
            {members.map((member) => (
              <li key={member.id} className="card flex flex-col gap-2 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-900">{member.fullName}</h3>
                    <p className="truncate text-sm text-slate-600">{member.email}</p>
                  </div>
                  <StatusBadge status={member.status} />
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button variant="secondary" size="sm" onClick={() => setDetails(member)}>
                    {t('action.viewDetails')}
                  </Button>
                  <Button
                    variant={member.status === 'active' ? 'danger' : 'success'}
                    size="sm"
                    onClick={() => setToToggle(member)}
                  >
                    {t(member.status === 'active' ? 'action.deactivate' : 'action.activate')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <Modal
        open={Boolean(details)}
        title={t('members.detailsTitle')}
        onClose={() => setDetails(null)}
      >
        {details && (
          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              { label: t('auth.fullName'), value: details.fullName },
              { label: t('auth.email'), value: details.email },
              { label: t('auth.phone'), value: details.phone },
              { label: t('auth.schoolYear'), value: details.schoolYear },
              { label: t('auth.department'), value: details.department },
              { label: t('members.joinedOn'), value: formatDate(details.createdAt, language) },
              {
                label: t('profile.emailVerification'),
                value: t(details.emailVerified ? 'status.verified' : 'status.unverified'),
              },
              { label: t('profile.accountStatus'), value: t(`status.${details.status}`) },
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

      <ConfirmDialog
        open={Boolean(toToggle)}
        variant={toToggle?.status === 'active' ? 'danger' : 'success'}
        title={t(toToggle?.status === 'active' ? 'action.deactivate' : 'action.activate')}
        description={toToggle?.fullName}
        confirmLabel={t('action.confirm')}
        loading={working}
        onConfirm={toggleStatus}
        onCancel={() => setToToggle(null)}
      />
    </div>
  )
}
