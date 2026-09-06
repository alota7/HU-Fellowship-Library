import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import Logo from '../common/Logo'
import ConfirmDialog from '../common/ConfirmDialog'
import { useTranslation } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export default function AppShell({ items, areaLabel }) {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
      toast.success(t('auth.logoutSuccess'))
      navigate('/login', { replace: true })
    } finally {
      setLoggingOut(false)
      setConfirmOpen(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        items={items}
        areaLabel={t(areaLabel)}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onLogout={() => setConfirmOpen(true)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={t('nav.openMenu')}
            aria-expanded={menuOpen}
            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-700"
          >
            ☰
          </button>
          <Logo size="sm" />
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <Outlet />
        </main>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={t('auth.logoutConfirmTitle')}
        description={t('auth.logoutConfirmText')}
        confirmLabel={t('nav.logout')}
        loading={loggingOut}
        onConfirm={handleLogout}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
