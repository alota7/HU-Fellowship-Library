import { NavLink } from 'react-router-dom'
import Logo from '../common/Logo'
import LanguageSelector from '../common/LanguageSelector'
import Button from '../common/Button'
import { useTranslation } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'

function itemClass({ isActive }) {
  return `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-700 text-white' : 'text-slate-700 hover:bg-brand-50 hover:text-brand-800'
  }`
}

export default function Sidebar({ items, areaLabel, open, onClose, onLogout }) {
  const { t } = useTranslation()
  const { user } = useAuth()

  const content = (
    <div className="flex h-full flex-col gap-6 overflow-y-auto border-r border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <Logo />
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 px-2 py-1 text-slate-600 lg:hidden"
          aria-label={t('nav.closeMenu')}
        >
          ✕
        </button>
      </div>

      <nav aria-label={areaLabel} className="flex-1">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {areaLabel}
        </p>
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.end} className={itemClass} onClick={onClose}>
                <span aria-hidden="true">{item.icon}</span>
                <span>{t(item.labelKey)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-3 border-t border-slate-200 pt-4">
        <LanguageSelector />
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="truncate text-sm font-semibold text-slate-800">{user?.fullName}</p>
          <p className="truncate text-xs text-slate-500">{user?.email}</p>
        </div>
        <Button variant="secondary" className="w-full" onClick={onLogout}>
          {t('nav.logout')}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden w-72 shrink-0 lg:block">
        <div className="sticky top-0 h-screen">{content}</div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t('nav.closeMenu')}
            className="absolute inset-0 bg-slate-900/50"
            onClick={onClose}
          />
          <div className="relative h-full w-72 max-w-[85%]">{content}</div>
        </div>
      )}
    </>
  )
}
