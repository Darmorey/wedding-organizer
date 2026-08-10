import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthProvider'
import { LoginPage } from './features/auth/pages/LoginPage'
import { RegisterPage } from './features/auth/pages/RegisterPage'
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from './features/auth/pages/ResetPasswordPage'
import { OnboardingPage } from './features/auth/pages/OnboardingPage'
import { HomePage } from './features/home/HomePage'
import { CategoriesPage } from './features/categories/pages/CategoriesPage'
import { CategoryDetailPage } from './features/categories/pages/CategoryDetailPage'
import { ProtectedRoute, GuestRoute } from './core/routing/ProtectedRoute'
import { AppShell } from './core/layout/AppShell'
import { SyncProvider } from './data/sync/SyncProvider'

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '')

function App() {
  return (
    <AuthProvider>
      <SyncProvider>
        <BrowserRouter basename={routerBasename || undefined}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/categories/:categoryId" element={<CategoryDetailPage />} />
              </Route>
            </Route>

            <Route path="/onboarding" element={<OnboardingPage />} />

            <Route path="/auth" element={<GuestRoute />}>
              <Route index element={<Navigate to="/auth/login" replace />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
            </Route>

            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SyncProvider>
    </AuthProvider>
  )
}

export default App
