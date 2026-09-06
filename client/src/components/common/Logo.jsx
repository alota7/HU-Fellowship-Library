import { useTranslation } from '../../context/LanguageContext'

export default function Logo({ size = 'md', showName = true, className = '' }) {
  const { t } = useTranslation()
  const dimension = size === 'lg' ? 'size-12' : size === 'sm' ? 'size-8' : 'size-10'

  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <img
        src="/logo.png"
        alt={t('app.name')}
        className={`${dimension} rounded-full bg-white object-contain`}
      />
      {showName && (
        <span className="text-base font-semibold leading-tight text-inherit">{t('app.name')}</span>
      )}
    </span>
  )
}
