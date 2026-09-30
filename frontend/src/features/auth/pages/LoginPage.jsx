import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Activity, Lock, Mail } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import RouteLoader from '../../../components/common/RouteLoader'

const isNonEmpty = (v) => typeof v === 'string' && v.trim().length > 0

function LoginField({ errorMessage, icon, label, ...inputProps }) {
  const isInvalid = Boolean(errorMessage)

  return (
    <div className="w-full">
      <label className={`text-sm font-medium mb-1.5 inline-block ${isInvalid ? 'text-red-500' : 'text-tele-dark'}`}>
        {label}
      </label>
      <div className="relative w-full">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
          {icon}
        </div>
        <input 
          className={`w-full rounded-input border py-2.5 pl-10 pr-3 text-sm text-tele-dark placeholder-gray-400 outline-none transition-all ${
            isInvalid 
              ? 'border-red-300 ring-1 ring-red-300 bg-red-50' 
              : 'border-tele-border bg-gray-50 focus:border-tele-primary focus:ring-1 focus:ring-tele-primary'
          }`}
          {...inputProps} 
        />
      </div>
      {errorMessage ? <p className="text-xs text-red-500 mt-1.5 font-medium">{errorMessage}</p> : null}
    </div>
  )
}

function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/'
  const defaultAfterLogin = auth.roleCode === 'super_admin' ? '/super/companies' : from

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touched, setTouched] = useState(false)

  const errors = useMemo(() => {
    const next = {}
    if (touched && !isNonEmpty(identifier)) next.identifier = 'Email or phone is required'
    if (touched && (password || '').length < 6) next.password = 'Password must be at least 6 characters'
    return next
  }, [identifier, password, touched])

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      navigate(defaultAfterLogin, { replace: true })
    }
  }, [auth.isAuthenticated, auth.isLoading, defaultAfterLogin, navigate])

  const onSubmit = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (errors.identifier || errors.password) return

    setIsSubmitting(true)
    try {
      const result = await auth.login({ identifier: identifier.trim(), password })
      const nextRole = result?.user?.role?.code || null
      const nextPath = nextRole === 'super_admin' ? '/super/companies' : from
      navigate(nextPath, { replace: true })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitting) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-tele-bg">
        <RouteLoader label="Logging in..." />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-tele-bg p-4 sm:p-8 font-sans">
      <div className="w-full max-w-[400px]">
        {/* Logo Section */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-tele-primary text-white shadow-soft">
            <Activity size={24} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-tele-dark">Welcome back</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to your Tele CRM account</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="tele-card p-6 sm:p-8">
          {auth.lastError?.message ? (
            <div className="mb-6 rounded-btn border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-medium text-red-700 text-center">{auth.lastError.message}</p>
            </div>
          ) : null}

          <form className="space-y-5" onSubmit={onSubmit}>
            <LoginField
              label="Email or phone"
              placeholder="admin@telecrm.local"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              errorMessage={errors.identifier}
              icon={<Mail size={18} />}
              autoComplete="username"
            />

            <LoginField
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              errorMessage={errors.password}
              icon={<Lock size={18} />}
              type="password"
              autoComplete="current-password"
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-4 flex h-11 w-full items-center justify-center rounded-btn bg-tele-primary font-semibold text-white shadow-md hover:bg-tele-secondary hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-tele-primary focus:ring-offset-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        {/* Dev hint */}
        {import.meta.env.DEV ? (
          <div className="mt-8 text-center text-xs text-gray-400">
            <p>Dev credentials: admin@telecrm.local / Admin@123</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default LoginPage
