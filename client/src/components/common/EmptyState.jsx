export default function EmptyState({ title, description, action, icon = '📚' }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span aria-hidden="true" className="text-4xl">
        {icon}
      </span>
      <p className="text-base font-semibold text-slate-800">{title}</p>
      {description && <p className="max-w-md text-sm text-slate-600">{description}</p>}
      {action}
    </div>
  )
}
