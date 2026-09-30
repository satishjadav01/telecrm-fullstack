import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute({ children }) {
  const auth = useAuth()
  const location = useLocation()

  if (auth.isLoading) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4">
        <div className="glass w-full max-w-md rounded-3xl p-6 text-center">
          <p className="text-lg font-semibold">Preparing your session</p>
          <p className="muted mt-2 text-sm">Checking your login status...</p>
        </div>
      </div>
    )
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

export default ProtectedRoute

