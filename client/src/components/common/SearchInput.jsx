import { useId } from 'react'
import { useTranslation } from '../../context/LanguageContext'

export default function SearchInput({ value, onChange, placeholder, className = '' }) {
  const { t } = useTranslation()
  const id = useId()

  return (
    <div className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">
        {t('action.search')}
      </label>
      <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        🔍
      </span>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder || t('action.search')}
        className="field-control pl-9 pr-16"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
        >
          {t('action.clear')}
        </button>
      )}
    </div>
  )
}
