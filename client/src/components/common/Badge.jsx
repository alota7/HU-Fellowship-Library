const TONES = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  info: 'bg-brand-50 text-brand-800 border-brand-200',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-900 border-amber-200',
  danger: 'bg-red-50 text-red-800 border-red-200',
}

const ICONS = {
  neutral: '•',
  info: 'ℹ',
  success: '✓',
  warning: '!',
  danger: '✕',
}

export default function Badge({ tone = 'neutral', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${TONES[tone]} ${className}`}
    >
      <span aria-hidden="true">{ICONS[tone]}</span>
      {children}
    </span>
  )
}
