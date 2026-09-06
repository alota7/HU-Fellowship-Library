import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthCard from './AuthCard'
import Input from '../../components/common/Input'
import Button from '../../components/common/Button'
import { useTranslation } from '../../context/LanguageContext'
import authService from '../../services/authService'
import { matches, minPassword, required, runValidators } from '../../utils/validation'

export default function ResetPassword() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [values, setValues] = useState({ password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [formError, setFormError] = useState(null)

  const setValue = (key) => (event) =>
    setValues((current) => ({ ...current, [key]: event.target.value }))

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return

    const nextErrors = runValidators(values, {
      password: [required, minPassword],
      confirmPassword: [required, (value, all) => matches(value, all.password)],
    })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSubmitting(true)
    setFormError(null)
    try {
      await authService.resetPassword({ token, password: values.password })
      setDone(true)
    } catch (error) {
      setFormError(t(error?.messageKey || 'error.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard
      title={t('auth.resetTitle')}
      subtitle={t('auth.resetSubtitle')}
      footer={
        <Link to="/login" className="font-semibold text-brand-800 hover:underline">
          {t('nav.login')}
        </Link>
      }
    >
      {done ? (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {t('auth.resetDone')}
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="grid gap-4">
          {formError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
              {formError}
            </p>
          )}
          <Input
            label={t('auth.password')}
            type="password"
            autoComplete="new-password"
            required
            value={values.password}
            onChange={setValue('password')}
            error={errors.password}
          />
          <Input
            label={t('auth.confirmPassword')}
            type="password"
            autoComplete="new-password"
            required
            value={values.confirmPassword}
            onChange={setValue('confirmPassword')}
            error={errors.confirmPassword}
          />
          <Button type="submit" className="w-full" loading={submitting}>
            {t('auth.resetSubmit')}
          </Button>
        </form>
      )}
    </AuthCard>
  )
}
