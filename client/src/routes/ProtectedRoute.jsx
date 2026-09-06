import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loading from '../components/common/Loading'

// Frontend route protection is a UX convenience only; the backend remains
// responsible for real authorization.
export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Loading className="min-h-screen" />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}
