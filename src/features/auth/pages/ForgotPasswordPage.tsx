import { useState, type FormEvent } from 'react'
import { supabase } from '../../../data/supabase/client'
import { PASSWORD_RESET_REDIRECT } from '../../../core/config/app'
import { Button } from '../../../core/ui/Button'
import { Input } from '../../../core/ui/Input'
import { AuthLayout, AuthLink } from '../components/AuthLayout'
import { translateAuthError } from '../utils/authErrors'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: PASSWORD_RESET_REDIRECT,
    })

    setSubmitting(false)

    if (resetError) {
      setError(translateAuthError(resetError.message))
      return
    }

    setInfo('Если аккаунт существует, мы отправили ссылку для сброса пароля.')
  }

  return (
    <AuthLayout
      title="Сброс пароля"
      subtitle="Свадебный организатор"
      footer={
        <>
          <AuthLink to="/auth/login">Вернуться ко входу</AuthLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted">
          Введите email — мы отправим ссылку для установки нового пароля.
        </p>
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {info ? <p className="text-sm text-accent-dark">{info}</p> : null}
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? 'Отправка…' : 'Отправить ссылку'}
        </Button>
      </form>
    </AuthLayout>
  )
}
