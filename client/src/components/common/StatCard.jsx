import { Link } from 'react-router-dom'

export default function StatCard({ label, value, icon, to }) {
  const body = (
    <>
      <span aria-hidden="true" className="text-2xl">
        {icon}
      </span>
      <p className="mt-2 text-sm font-medium text-slate-600">{label}</p>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
    </>
  )

  if (to) {
    return (
      <Link to={to} className="card p-5 transition-shadow hover:shadow-md">
        {body}
      </Link>
    )
  }
  return <div className="card p-5">{body}</div>
}
