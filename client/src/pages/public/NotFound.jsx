import { Link } from 'react-router-dom'
import Button from '../../components/common/Button'
import { useTranslation } from '../../context/LanguageContext'

export default function NotFound() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl font-bold text-brand-800">404</p>
      <h1 className="text-xl font-semibold text-slate-900">{t('ui.notFoundTitle')}</h1>
      <p className="text-sm text-slate-600">{t('ui.notFoundText')}</p>
      <Link to="/">
        <Button>{t('ui.backHome')}</Button>
      </Link>
    </div>
  )
}
