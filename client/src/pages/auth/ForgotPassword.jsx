import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthCard from './AuthCard'
import Input from '../../components/common/Input'
import Button from '../../components/common/Button'
import { useTranslation } from '../../context/LanguageContext'
import authService from '../../services/authService'
import { email as emailRule, required, runValidators } from '../../utils/validation'

export default function ForgotPassword() {
  const { t } = useTranslation()
  const [values, setValues] = useState({ email: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [formError, setFormError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return

    const nextErrors = runValidators(values, { email: [required, emailRule] })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSubmitting(true)
    setFormError(null)
    try {
      await authService.forgotPassword(values.email)
      setSent(true)
    } catch (error) {
      setFormError(t(error?.messageKey || 'error.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard
      title={t('auth.forgotTitle')}
      subtitle={t('auth.forgotSubtitle')}
      footer={
        <Link to="/login" className="font-semibold text-brand-800 hover:underline">
          {t('nav.login')}
        </Link>
      }
    >
      {sent ? (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {t('auth.forgotSent')}
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="grid gap-4">
          {formError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
              {formError}
            </p>
          )}
          <Input
            label={t('auth.email')}
            type="email"
            autoComplete="email"
            required
            value={values.email}
            onChange={(event) => setValues({ email: event.target.value })}
            error={errors.email}
          />
          <Button type="submit" className="w-full" loading={submitting}>
            {t('auth.forgotSubmit')}
          </Button>
        </form>
      )}
    </AuthCard>
  )
}
