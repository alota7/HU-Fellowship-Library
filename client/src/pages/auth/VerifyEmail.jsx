import { Link, useSearchParams } from 'react-router-dom'
import AuthCard from './AuthCard'
import Loading from '../../components/common/Loading'
import { useTranslation } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import authService from '../../services/authService'

export default function VerifyEmail() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const { loading, error } = useAsyncData(() => authService.verifyEmail(token), [token])

  return (
    <AuthCard
      title={t('auth.verifyTitle')}
      footer={
        <div className="flex flex-col gap-1">
          <Link to="/login" className="font-semibold text-brand-800 hover:underline">
            {t('nav.login')}
          </Link>
          <Link to="/resend-verification" className="font-semibold text-brand-800 hover:underline">
            {t('auth.resendSubmit')}
          </Link>
        </div>
      }
    >
      {loading && <Loading label={t('auth.verifying')} />}
      {!loading && error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {t('auth.verifyFailed')}
        </p>
      )}
      {!loading && !error && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {t('auth.verifySuccess')}
        </p>
      )}
    </AuthCard>
  )
}
