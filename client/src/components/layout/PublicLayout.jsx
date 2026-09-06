import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import Logo from '../common/Logo'
import Button from '../common/Button'
import LanguageSelector from '../common/LanguageSelector'
import { useTranslation } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'

const publicItems = [
  { to: '/', labelKey: 'nav.home', end: true },
  { to: '/books', labelKey: 'nav.books' },
  { to: '/summer-bible-study-notes', labelKey: 'nav.summerNotes' },
]

function linkClass({ isActive }) {
  return `rounded-lg px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-700 hover:bg-slate-100'
  }`
}

export default function PublicLayout() {
  const { t } = useTranslation()
  const { isAuthenticated, isAdmin } = useAuth()
  const [open, setOpen] = useState(false)

  const dashboardPath = isAdmin ? '/admin/dashboard' : '/member/dashboard'

  const actions = isAuthenticated ? (
    <Link to={dashboardPath}>
      <Button size="sm">{t('nav.dashboard')}</Button>
    </Link>
  ) : (
    <div className="flex items-center gap-2">
      <Link to="/login">
        <Button variant="secondary" size="sm">
          {t('nav.login')}
        </Button>
      </Link>
      <Link to="/register">
        <Button size="sm">{t('nav.register')}</Button>
      </Link>
    </div>
  )

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="text-slate-900">
            <Logo />
          </Link>

          <nav aria-label={t('nav.mainNavigation')} className="hidden items-center gap-1 lg:flex">
            {publicItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
                {t(item.labelKey)}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            {isAuthenticated && <LanguageSelector />}
            {actions}
          </div>

          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700 lg:hidden"
            aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? '✕' : '☰'}
          </button>
        </div>

        {open && (
          <div className="border-t border-slate-200 px-4 py-3 lg:hidden">
            <nav aria-label={t('nav.mainNavigation')} className="flex flex-col gap-1">
              {publicItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={linkClass}
                  onClick={() => setOpen(false)}
                >
                  {t(item.labelKey)}
                </NavLink>
              ))}
            </nav>
            <div className="mt-3 flex flex-col gap-3">
              {isAuthenticated && <LanguageSelector />}
              {actions}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Logo size="sm" />
          <p>{t('app.tagline')}</p>
        </div>
      </footer>
    </div>
  )
}
