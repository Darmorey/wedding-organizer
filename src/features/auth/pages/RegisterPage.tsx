import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../../data/supabase/client'
import { Button } from '../../../core/ui/Button'
import { Input } from '../../../core/ui/Input'
import { AuthLayout, AuthLink } from '../components/AuthLayout'
import {
  isEmailAlreadyRegisteredError,
  isRateLimitError,
  translateAuthError,
} from '../utils/authErrors'
import { useAuth } from '../AuthProvider'

function EmailConfirmationNotice({ email }: { email: string }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-cream px-4 py-4 text-sm leading-relaxed text-ink">
        <p className="font-medium text-accent-dark">Проверьте почту</p>
        <p className="mt-2">
          Мы отправили письмо на{' '}
          <span className="font-medium text-accent-dark">{email}</span>. Перейдите по ссылке в
          письме, чтобы подтвердить аккаунт.
        </p>
        <p className="mt-2 text-muted">
          Не видите письмо? Загляните в «Спам» или подождите пару минут.
        </p>
      </div>
      <Link to="/auth/login" className="block">
        <Button fullWidth type="button">
          Перейти ко входу
        </Button>
      </Link>
    </div>
  )
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [rateLimitHint, setRateLimitHint] = useState<string | null>(null)
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && session) {
    return <Navigate to="/onboarding" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setRateLimitHint(null)

    if (password !== confirm) {
      setError('Пароли не совпадают')
      return
    }

    const trimmedEmail = email.trim()
    setSubmitting(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
    })

    setSubmitting(false)

    if (signUpError) {
      const message = signUpError.message

      if (isEmailAlreadyRegisteredError(message)) {
        setAwaitingConfirmation(true)
        return
      }

      if (isRateLimitError(message)) {
        setError(translateAuthError(message))
        setRateLimitHint(
          'Если письмо уже пришло — подтвердите email по ссылке и войдите. Повторная регистрация не нужна.',
        )
        return
      }

      setError(translateAuthError(message))
      return
    }

    if (data.session) {
      navigate('/onboarding', { replace: true })
      return
    }

    setAwaitingConfirmation(true)
  }

  if (awaitingConfirmation) {
    return (
      <AuthLayout
        title="Подтвердите email"
        subtitle="Свадебный организатор"
        footer={
          <>
            Уже подтвердили? <AuthLink to="/auth/login">Войти</AuthLink>
          </>
        }
      >
        <EmailConfirmationNotice email={email.trim()} />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Регистрация"
      subtitle="Свадебный организатор"
      footer={
        <>
          Уже есть аккаунт? <AuthLink to="/auth/login">Войти</AuthLink>
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
          autoComplete="new-password"
          minLength={6}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label="Повторите пароль"
          type="password"
          name="confirm"
          autoComplete="new-password"
          minLength={6}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {rateLimitHint ? <p className="text-sm text-accent-dark">{rateLimitHint}</p> : null}
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? 'Регистрация…' : 'Создать аккаунт'}
        </Button>
      </form>
    </AuthLayout>
  )
}
