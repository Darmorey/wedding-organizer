import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../../../data/supabase/client'
import { Button } from '../../../core/ui/Button'
import { Input } from '../../../core/ui/Input'
import { AuthLayout } from '../components/AuthLayout'
import { translateAuthError } from '../utils/authErrors'
import { useAuth } from '../AuthProvider'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { session, loading } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session))
    })
  }, [])

  if (!loading && ready && !session) {
    return <Navigate to="/auth/login" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Пароли не совпадают')
      return
    }

    setSubmitting(true)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    setSubmitting(false)

    if (updateError) {
      setError(translateAuthError(updateError.message))
      return
    }

    navigate('/', { replace: true })
  }

  return (
    <AuthLayout title="Новый пароль" subtitle="Свадебный организатор">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Новый пароль"
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
        <Button type="submit" fullWidth disabled={submitting || !ready}>
          {submitting ? 'Сохранение…' : 'Сохранить пароль'}
        </Button>
      </form>
    </AuthLayout>
  )
}
