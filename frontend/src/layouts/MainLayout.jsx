import { useCallback, useEffect, useRef, useState } from 'react'
import { Activity, ChevronRight, LogOut, Menu, UserRound, X, Bell, Search, Sun, Moon } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { navItems } from '../app/navigation'
import { useAuth } from '../features/auth/context/AuthContext'
import RouteLoader from '../components/common/RouteLoader'
import { useTheme } from '../components/common/ThemeProvider'
import { AnimatePresence, motion } from 'framer-motion'

function MainLayout() {
  const auth = useAuth()
  const location = useLocation()
  const { theme, setTheme } = useTheme()
  const routeUnlockTimerRef = useRef(null)
  const [pendingRoute, setPendingRoute] = useState('')
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isMobileProfileMenuOpen, setIsMobileProfileMenuOpen] = useState(false)
  const isRouteSwitching = Boolean(pendingRoute)

  const unlockRouteGuard = useCallback((delay = 0) => {
    if (routeUnlockTimerRef.current) {
      window.clearTimeout(routeUnlockTimerRef.current)
    }

    routeUnlockTimerRef.current = window.setTimeout(() => {
      routeUnlockTimerRef.current = null
      setPendingRoute('')
    }, delay)
  }, [])

  const handleNavIntent = useCallback(
    (event, to) => {
      if (to === location.pathname) return

      if (pendingRoute) {
        event.preventDefault()
        return
      }

      setPendingRoute(to)
      unlockRouteGuard(1200)
    },
    [location.pathname, pendingRoute, unlockRouteGuard],
  )

  useEffect(() => {
    if (pendingRoute && location.pathname === pendingRoute) {
      unlockRouteGuard(500)
    }
  }, [location.pathname, pendingRoute, unlockRouteGuard])

  useEffect(() => {
    return () => {
      if (routeUnlockTimerRef.current) {
        window.clearTimeout(routeUnlockTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isMobileDrawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileDrawerOpen])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        return
      }
      if (e.key === 'd' || e.key === 'D') {
        setTheme(theme === 'dark' ? 'light' : 'dark')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setTheme, theme])

  const visibleNavItems = navItems.filter((item) => {
    if (!item.roles?.length) return true
    return item.roles.includes(auth.roleCode)
  })

  const orderMap = {
    '/': 1,
    '/leads': 2,
    '/calls': 3,
    '/agent/calls': 3,
    '/followups': 4,
    '/shopify-abandoned': 5,
    '/recordings': 6,
    '/super/companies': 7,
    '/super/rbac': 8,
    '/help': 9,
  }

  const sortedNavItems = [...visibleNavItems].sort((a, b) => {
    const orderA = orderMap[a.to] || 99
    const orderB = orderMap[b.to] || 99
    return orderA - orderB
  })

  const activeItem = visibleNavItems.find((item) => {
    if (item.to === '/') return location.pathname === '/'
    return location.pathname.startsWith(item.to)
  })
  const pendingItem = visibleNavItems.find((item) => item.to === pendingRoute)
  const routeLoadingLabel = pendingItem ? 'Loading ' + pendingItem.label + '...' : 'Loading module...'

  const roleLabel = auth.roleCode?.replace('_', ' ') || 'workspace'

  return (
    <div className="flex h-screen w-full overflow-hidden bg-tele-bg text-tele-dark font-sans">
      {/* Desktop Sidebar */}
      <aside className={`hidden shrink-0 border-r border-tele-border transition-[width] duration-200 lg:flex lg:flex-col h-full bg-tele-card z-20 ${isDesktopSidebarCollapsed ? 'w-20' : 'w-[250px]'}`}>
        <div className={`flex h-16 items-center border-b border-tele-border shrink-0 ${isDesktopSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-6'}`}>
          {!isDesktopSidebarCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-tele-primary text-white">
                <Activity size={18} />
              </div>
              <span className="text-base font-bold tracking-tight text-tele-dark">Tele CRM</span>
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-tele-primary text-white cursor-pointer" onClick={() => setIsDesktopSidebarCollapsed(false)}>
              <Activity size={18} />
            </div>
          )}
          {!isDesktopSidebarCollapsed && (
            <button
              type="button"
              onClick={() => setIsDesktopSidebarCollapsed(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-tele-muted hover:bg-tele-bg hover:text-tele-dark focus:outline-none transition-colors"
            >
              <Menu size={18} />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-soft">
          <div className="mb-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {!isDesktopSidebarCollapsed ? 'Menu' : '---'}
          </div>
          <ul className="space-y-1.5">
            {sortedNavItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={(event) => handleNavIntent(event, item.to)}
                    aria-disabled={isRouteSwitching}
                    title={isDesktopSidebarCollapsed ? item.label : undefined}
                    className={({ isActive }) => {
                      const isPending = pendingRoute === item.to
                      const isBlocked = isRouteSwitching && !isPending

                      return `group flex h-10 items-center rounded-btn text-sm font-medium transition-all duration-200 ${isDesktopSidebarCollapsed ? 'justify-center px-0' : 'px-3'} ${isActive
                        ? 'bg-tele-light text-tele-dark shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-tele-dark'
                        } ${isPending ? 'cursor-progress opacity-80' : ''} ${isBlocked ? 'pointer-events-none opacity-50' : ''}`
                    }}
                  >
                    {({ isActive }) => (
                      <>
                        <span className={`flex min-w-0 items-center ${isDesktopSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                          <Icon size={18} className={`shrink-0 transition-colors ${isActive ? 'text-tele-primary' : 'text-gray-400 group-hover:text-tele-primary'}`} />
                          {!isDesktopSidebarCollapsed && <span className="truncate">{item.label}</span>}
                        </span>
                      </>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="p-3 border-t border-tele-border bg-tele-card shrink-0 relative">
          {isProfileMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)} />
              <div className={`absolute z-50 rounded-card border border-tele-border bg-tele-card p-2 shadow-medium ${isDesktopSidebarCollapsed
                ? 'bottom-0 left-full ml-2 w-48'
                : 'bottom-full left-3 right-3 mb-2'
                }`}>
                <div className="px-3 py-2 border-b border-tele-border mb-2">
                  <p className="text-sm font-semibold text-tele-dark truncate">{auth.user?.fullName}</p>
                  <p className="text-xs text-gray-500 capitalize">{roleLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false)
                    auth.logout()
                  }}
                  className="flex w-full items-center gap-2 rounded-btn px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} className="shrink-0" />
                  <span>Logout</span>
                </button>
              </div>
            </>
          )}
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className={`group flex w-full items-center rounded-btn py-2 transition-colors hover:bg-gray-50 ${isDesktopSidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'
              }`}
          >
            {!isDesktopSidebarCollapsed && (
              <div className="text-left min-w-0 flex items-center gap-3">
                 <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tele-light text-tele-primary font-bold text-sm">
                  {auth.user?.fullName?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="max-w-[120px] truncate text-sm font-semibold text-tele-dark">{auth.user?.fullName || 'User'}</p>
                  <p className="text-xs capitalize text-gray-500">{roleLabel}</p>
                </div>
              </div>
            )}
            {isDesktopSidebarCollapsed && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tele-light text-tele-primary font-bold text-sm">
                {auth.user?.fullName?.charAt(0) || 'U'}
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex flex-1 flex-col h-full overflow-hidden min-w-0">
        
        {/* Top Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-tele-border px-4 sm:px-8 bg-tele-card z-10">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen((open) => !open)}
              className="flex h-9 w-9 items-center justify-center rounded-btn text-gray-500 hover:bg-gray-100 lg:hidden transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="hidden lg:flex items-center gap-2">
               <h1 className="text-lg font-semibold text-tele-dark">{activeItem?.label || 'Overview'}</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <button
               type="button"
               onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
               className="flex h-9 w-9 items-center justify-center rounded-btn text-gray-500 hover:bg-gray-100 dark:hover:bg-tele-border transition-colors"
               aria-label="Toggle theme"
             >
               {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
             </button>
             {/* Removed Search Bar Placeholder and Notifications per user request */}
          </div>
          
          {isRouteSwitching && (
            <div className="absolute inset-x-0 bottom-0 h-[2px] bg-tele-light">
              <div className="h-full w-1/3 animate-pulse bg-tele-primary rounded-full" />
            </div>
          )}
        </header>

        {/* Main Canvas */}
        <main
          className="relative flex-1 overflow-y-auto p-4 sm:p-8 bg-tele-bg"
          aria-busy={isRouteSwitching}
        >
          {isRouteSwitching && (
            <div className={`fixed inset-0 top-16 z-30 flex items-center justify-center bg-tele-bg/50 backdrop-blur-sm ${isDesktopSidebarCollapsed ? 'lg:left-20' : 'lg:left-[250px]'}`}>
              <RouteLoader label={routeLoadingLabel} />
            </div>
          )}
          <div className={`mx-auto max-w-7xl transition-opacity duration-200 ${isRouteSwitching ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-0 z-40 bg-tele-dark/20 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${isMobileDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileDrawerOpen(false)}
      />

      <div
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-[280px] flex-col bg-tele-card border-r border-tele-border transition-transform duration-300 ease-in-out transform lg:hidden ${isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-tele-border px-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-tele-primary text-white">
              <Activity size={18} />
            </div>
            <span className="text-base font-bold tracking-tight text-tele-dark">Tele CRM</span>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-4 scrollbar-soft">
          <ul className="space-y-1.5">
            {sortedNavItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={(event) => {
                      handleNavIntent(event, item.to)
                      setIsMobileDrawerOpen(false)
                    }}
                    className={({ isActive }) => {
                      const isPending = pendingRoute === item.to
                      return `group flex h-11 items-center gap-3 rounded-btn px-4 text-sm font-medium transition-all ${isActive
                        ? 'bg-tele-light text-tele-dark shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50'
                        } ${isPending ? 'opacity-80' : ''}`
                    }}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon size={18} className={`shrink-0 ${isActive ? 'text-tele-primary' : 'text-gray-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-tele-border bg-gray-50 shrink-0">
           <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tele-light text-tele-primary font-bold">
                {auth.user?.fullName?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-tele-dark">{auth.user?.fullName || 'User'}</p>
                <p className="text-xs text-gray-500 capitalize">{roleLabel}</p>
              </div>
           </div>
           <button
             onClick={() => {
               setIsMobileDrawerOpen(false)
               auth.logout()
             }}
             className="w-full flex items-center justify-center gap-2 rounded-btn bg-white border border-gray-200 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
           >
             <LogOut size={16} />
             Logout
           </button>
        </div>
      </div>
    </div>
  )
}

export default MainLayout