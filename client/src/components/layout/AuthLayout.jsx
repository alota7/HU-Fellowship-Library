import { Link, Outlet } from 'react-router-dom'
import Logo from '../common/Logo'
import { useEnglishOnly, useTranslation } from '../../context/LanguageContext'

// Authentication screens are always shown in English; the language selector
// becomes available once the user is signed in.
export default function AuthLayout() {
  useEnglishOnly()
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="text-slate-900">
            <Logo />
          </Link>
          <Link to="/books" className="text-sm font-medium text-brand-800 hover:underline">
            {t('nav.books')}
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
