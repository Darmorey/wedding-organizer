import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthProvider'

export function ProtectedRoute() {
  const { session, loading, projects } = useAuth()

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-muted">
        Загрузка…
      </main>
    )
  }

  if (!session) {
    return <Navigate to="/auth/login" replace />
  }

  if (projects.length === 0) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}

export function GuestRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-muted">
        Загрузка…
      </main>
    )
  }

  if (session) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
