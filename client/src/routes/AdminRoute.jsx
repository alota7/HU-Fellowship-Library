import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loading from '../components/common/Loading'

export default function AdminRoute() {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Loading className="min-h-screen" />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  if (!isAdmin) return <Navigate to="/member/dashboard" replace />
  return <Outlet />
}
