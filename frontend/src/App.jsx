import { RouterProvider } from 'react-router-dom'
import { appRouter } from './app/router'
import { AuthProvider } from './features/auth/context/AuthContext'
import { ToastProvider } from './components/common/ToastProvider'
import ErrorBoundary from './components/common/ErrorBoundary'
import { ThemeProvider } from './components/common/ThemeProvider'

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="telecrm-theme">
        <ToastProvider>
          <AuthProvider>
            <RouterProvider router={appRouter} />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
