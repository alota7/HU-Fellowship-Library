import { useId } from 'react'
import { useLanguage } from '../../context/LanguageContext'

export default function LanguageSelector({ className = '' }) {
  const { language, setLanguage, languages, t } = useLanguage()
  const id = useId()

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {t('language.label')}
      </label>
      <select
        id={id}
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium text-slate-800 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
      >
        {languages.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
