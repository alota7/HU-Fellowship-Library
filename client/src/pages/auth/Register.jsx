import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthCard from './AuthCard'
import Input from '../../components/common/Input'
import Button from '../../components/common/Button'
import { useTranslation } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import {
  email as emailRule,
  matches,
  minPassword,
  required,
  runValidators,
} from '../../utils/validation'

const initialValues = {
  fullName: '',
  email: '',
  phone: '',
  schoolYear: '',
  department: '',
  password: '',
  confirmPassword: '',
}

export default function Register() {
  const { t } = useTranslation()
  const { register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const setValue = (key) => (event) =>
    setValues((current) => ({ ...current, [key]: event.target.value }))

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return

    const nextErrors = runValidators(values, {
      fullName: [required],
      email: [required, emailRule],
      phone: [required],
      schoolYear: [required],
      department: [required],
      password: [required, minPassword],
      confirmPassword: [
        required,
        (value, all) => matches(value, all.password),
      ],
    })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setSubmitting(true)
    setFormError(null)
    try {
      await register(values)
      toast.success(t('auth.registerSuccess'))
      navigate('/login', { replace: true })
    } catch (registerError) {
      setFormError(t(registerError?.messageKey || 'error.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard
      title={t('auth.registerTitle')}
      subtitle={t('auth.registerSubtitle')}
      footer={
        <p>
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="font-semibold text-brand-800 hover:underline">
            {t('nav.login')}
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
          label={t('auth.fullName')}
          autoComplete="name"
          required
          value={values.fullName}
          onChange={setValue('fullName')}
          error={errors.fullName}
        />
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
          label={t('auth.phone')}
          type="tel"
          autoComplete="tel"
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

        <Button
          type="submit"
          className="w-full"
          loading={submitting}
          loadingLabel={t('auth.registering')}
        >
          {t('auth.registerTitle')}
        </Button>
      </form>
    </AuthCard>
  )
}
