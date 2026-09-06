import { useTranslation } from '../../context/LanguageContext'
import Spinner from './Spinner'

export default function Loading({ label, className = '' }) {
  const { t } = useTranslation()
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center gap-3 py-12 text-slate-600 ${className}`}
    >
      <Spinner />
      <span className="text-sm font-medium">{label || t('status.loading')}</span>
    </div>
  )
}

export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="card overflow-hidden p-4">
          <div className="skeleton aspect-[3/4] w-full" />
          <div className="skeleton mt-4 h-4 w-3/4" />
          <div className="skeleton mt-2 h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}
