import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../../../data/supabase/client'
import { Button } from '../../../core/ui/Button'
import { Input } from '../../../core/ui/Input'
import { AuthLayout, AuthLink } from '../components/AuthLayout'
import { translateAuthError } from '../utils/authErrors'
import { useAuth } from '../AuthProvider'

export function LoginPage() {
  const navigate = useNavigate()
  const { session, loading, projects } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && session) {
    return <Navigate to={projects.length > 0 ? '/' : '/onboarding'} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setSubmitting(false)

    if (signInError) {
      setError(translateAuthError(signInError.message))
      return
    }

    navigate('/', { replace: true })
  }

  return (
    <AuthLayout
      title="Вход"
      subtitle="Свадебный организатор"
      footer={
        <>
          Нет аккаунта? <AuthLink to="/auth/register">Зарегистрироваться</AuthLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Пароль"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="text-right">
          <Link to="/auth/forgot-password" className="text-sm text-accent-dark hover:text-accent">
            Забыли пароль?
          </Link>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? 'Вход…' : 'Войти'}
        </Button>
      </form>
    </AuthLayout>
  )
}
