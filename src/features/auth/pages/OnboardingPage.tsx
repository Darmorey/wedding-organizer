import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../../../core/ui/Button'
import { Input } from '../../../core/ui/Input'
import { AuthLayout } from '../components/AuthLayout'
import { useAuth } from '../AuthProvider'
import { bootstrapNewProject, joinWeddingProject } from '../../../data/supabase/projectService'
import { syncProject } from '../../../data/sync/syncEngine'
import { translateAuthError } from '../utils/authErrors'
import { ProjectCreateWizard } from '../../projects/ProjectCreateWizard'
import type { CategoryTemplate } from '../../../core/config/templates'

type Mode = 'create' | 'join'

export function OnboardingPage() {
  const navigate = useNavigate()
  const { session, loading, projects, refreshProjects, setActiveProjectId } = useAuth()
  const [mode, setMode] = useState<Mode>('create')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && !session) {
    return <Navigate to="/auth/login" replace />
  }

  if (!loading && projects.length > 0) {
    return <Navigate to="/" replace />
  }

  async function handleCreate(name: string, templates: CategoryTemplate[] | null) {
    setError(null)
    setSubmitting(true)

    try {
      const project = await bootstrapNewProject(name, templates)
      await refreshProjects()
      setActiveProjectId(project.id)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? translateAuthError(err.message) : 'Не удалось создать проект')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const projectId = await joinWeddingProject(inviteCode)
      await syncProject(projectId)
      await refreshProjects()
      setActiveProjectId(projectId)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? translateAuthError(err.message) : 'Не удалось присоединиться')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Ваш проект" subtitle="Свадебный организатор">
      <div className="mb-6 flex gap-2 rounded-xl bg-cream p-1">
        <button
          type="button"
          className={[
            'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            mode === 'create' ? 'bg-white text-accent-dark shadow-sm' : 'text-muted',
          ].join(' ')}
          onClick={() => setMode('create')}
        >
          Создать
        </button>
        <button
          type="button"
          className={[
            'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            mode === 'join' ? 'bg-white text-accent-dark shadow-sm' : 'text-muted',
          ].join(' ')}
          onClick={() => setMode('join')}
        >
          Присоединиться
        </button>
      </div>

      {mode === 'create' ? (
        <ProjectCreateWizard submitting={submitting} error={error} onCreate={(name, templates) => void handleCreate(name, templates)} />
      ) : (
        <form onSubmit={handleJoin} className="space-y-4">
          <Input
            label="Код приглашения"
            name="inviteCode"
            placeholder="ABC123"
            required
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? 'Подключение…' : 'Присоединиться'}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
