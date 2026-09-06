import { useState } from 'react'
import PageHeader from '../../components/common/PageHeader'
import Input from '../../components/common/Input'
import Button from '../../components/common/Button'
import StatusBadge from '../../components/common/StatusBadge'
import { useTranslation } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import userService from '../../services/userService'
import { required, runValidators } from '../../utils/validation'

export default function MemberProfile() {
  const { t } = useTranslation()
  const { user, updateUser } = useAuth()
  const toast = useToast()

  const [values, setValues] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    schoolYear: user?.schoolYear || '',
    department: user?.department || '',
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const setValue = (key) => (event) =>
    setValues((current) => ({ ...current, [key]: event.target.value }))

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return

    const nextErrors = runValidators(values, {
      fullName: [required],
      phone: [required],
      schoolYear: [required],
      department: [required],
    })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSubmitting(true)
    try {
      const updated = await userService.updateProfile(values)
      updateUser(updated)
      toast.success(t('profile.updated'))
    } catch (updateError) {
      toast.error(t(updateError?.messageKey || 'profile.updateError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('profile.title')} />

      <section className="card grid gap-4 p-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('auth.email')}
          </p>
          <p className="text-sm font-medium text-slate-800">{user?.email}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('profile.role')}
          </p>
          <p className="text-sm font-medium text-slate-800">
            {t(user?.role === 'admin' ? 'profile.roleAdmin' : 'profile.roleMember')}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('profile.accountStatus')}
          </p>
          <StatusBadge status={user?.status} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('profile.emailVerification')}
          </p>
          <StatusBadge status={user?.emailVerified ? 'verified' : 'unverified'} />
        </div>
      </section>

      <form onSubmit={handleSubmit} noValidate className="card grid gap-4 p-6 sm:grid-cols-2">
        <Input
          label={t('auth.fullName')}
          required
          value={values.fullName}
          onChange={setValue('fullName')}
          error={errors.fullName}
        />
        <Input
          label={t('auth.phone')}
          required
          value={values.phone}
          onChange={setValue('phone')}
          error={errors.phone}
        />
        <Input
          label={t('auth.schoolYear')}
          required
          value={values.schoolYear}
          onChange={setValue('schoolYear')}
          error={errors.schoolYear}
        />
        <Input
          label={t('auth.department')}
          required
          value={values.department}
          onChange={setValue('department')}
          error={errors.department}
        />
        <div className="sm:col-span-2 sm:justify-self-end">
          <Button type="submit" loading={submitting} loadingLabel={t('status.saving')}>
            {t('action.save')}
          </Button>
        </div>
      </form>
    </div>
  )
}
