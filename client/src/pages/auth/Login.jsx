import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthCard from './AuthCard'
import Input, { Checkbox } from '../../components/common/Input'
import Button from '../../components/common/Button'
import { useTranslation } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { email as emailRule, required, runValidators } from '../../utils/validation'

export default function Login() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [values, setValues] = useState({ email: '', password: '', rememberMe: true })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const setValue = (key) => (event) =>
    setValues((current) => ({ ...current, [key]: event.target.value }))

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return

    const nextErrors = runValidators(values, {
      email: [required, emailRule],
      password: [required],
    })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSubmitting(true)
    setFormError(null)
    try {
      const user = await login({ email: values.email, password: values.password })
      toast.success(t('auth.loginSuccess'))
      const fallback = user.role === 'admin' ? '/admin/dashboard' : '/member/dashboard'
      navigate(location.state?.from?.pathname || fallback, { replace: true })
    } catch (loginError) {
      setFormError(t(loginError?.messageKey || 'error.loginFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard
      title={t('auth.loginTitle')}
      subtitle={t('auth.loginSubtitle')}
      footer={
        <p>
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-semibold text-brand-800 hover:underline">
            {t('nav.register')}
          </Link>
        </p>
      }
    >
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
          onChange={setValue('email')}
          error={errors.email}
        />
        <Input
          label={t('auth.password')}
          type="password"
          autoComplete="current-password"
          required
          value={values.password}
          onChange={setValue('password')}
          error={errors.password}
        />

        <div className="flex items-center justify-between gap-3">
          <Checkbox
            label={t('auth.rememberMe')}
            checked={values.rememberMe}
            onChange={(event) =>
              setValues((current) => ({ ...current, rememberMe: event.target.checked }))
            }
          />
          <Link to="/forgot-password" className="text-sm font-medium text-brand-800 hover:underline">
            {t('auth.forgotPassword')}
          </Link>
        </div>

        <Button type="submit" className="w-full" loading={submitting} loadingLabel={t('auth.loggingIn')}>
          {t('auth.loginTitle')}
        </Button>
      </form>
    </AuthCard>
  )
}
