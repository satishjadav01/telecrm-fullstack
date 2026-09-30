import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function RoleGuard({ allow = [], children }) {
  const auth = useAuth()
  const location = useLocation()

  if (auth.isLoading) return null

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!allow.length) return children

  const ok = allow.includes(auth.roleCode)
  if (ok) return children

  return (
    <div className="glass rounded-3xl p-6">
      <p className="text-lg font-semibold">Access denied</p>
      <p className="muted mt-2 text-sm">
        Your role <span className="font-medium text-black">{auth.roleCode || 'unknown'}</span> cannot access this page.
      </p>
    </div>
  )
}

export default RoleGuard

