import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '../auth/AuthProvider'
import { Card } from '../../core/ui/Card'
import { ProgressBar } from '../../core/ui/ProgressBar'
import { Button } from '../../core/ui/Button'
import { db } from '../../data/db/database'
import { categoryRepository } from '../../data/repositories/categoryRepository'
import { guestRepository } from '../../data/repositories/guestRepository'

export function HomePage() {
  const { user, activeProject, projects, setActiveProjectId, signOut } = useAuth()

  const stats = useLiveQuery(async () => {
    if (!activeProject?.id) return { total: 0, done: 0 }
    const tasks = await db.tasks.where('projectId').equals(activeProject.id).toArray()
    const active = tasks.filter((task) => !task.deletedAt)
    return {
      total: active.length,
      done: active.filter((task) => task.done).length,
    }
  }, [activeProject?.id])

  const categories = useLiveQuery(async () => {
    if (!activeProject?.id) return []
    return categoryRepository.listByProject(activeProject.id)
  }, [activeProject?.id])

  const guestStats = useLiveQuery(async () => {
    if (!activeProject?.id) return null
    return guestRepository.getStats(activeProject.id)
  }, [activeProject?.id])

  const percent =
    stats && stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{user?.email}</p>
        </div>
        <Button variant="ghost" onClick={() => signOut()}>
          Выйти
        </Button>
      </div>

      <Card title="Общий прогресс" subtitle="Задачи">
        <p className="mb-2 text-3xl font-semibold text-accent-dark">{percent}%</p>
        <p className="mb-3 text-sm text-muted">
          {stats?.done ?? 0} из {stats?.total ?? 0} задач выполнено
        </p>
        <ProgressBar value={percent} />
      </Card>

      <Card title="Гости" subtitle="RSVP">
        <p className="mb-2 text-sm text-muted">
          Подтвердили: <span className="font-medium text-ink">{guestStats?.attendingPeople ?? 0}</span>{' '}
          чел. ({guestStats?.attendingAdults ?? 0} взр., {guestStats?.attendingChildren ?? 0} дет.)
        </p>
        <p className="mb-3 text-xs text-muted">
          Ожидаем {guestStats?.expectedPeople ?? 0} · в списке {guestStats?.invited ?? 0} записей
        </p>
        <Link to="/guests" className="text-sm font-medium text-accent-dark hover:text-accent">
          Открыть список →
        </Link>
      </Card>

      {activeProject ? (
        <Card title="Пригласить партнёра">
          <p className="text-sm text-muted">
            Код приглашения:{' '}
            <span className="font-mono font-semibold text-accent-dark">
              {activeProject.inviteCode}
            </span>
          </p>
        </Card>
      ) : null}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-accent-dark">Категории</h2>
          <Link to="/categories" className="text-sm text-accent-dark hover:text-accent">
            Все →
          </Link>
        </div>
        <div className="space-y-2">
          {(categories ?? []).slice(0, 4).map((category) => (
            <Link
              key={category.id}
              to={`/categories/${category.id}`}
              className="flex items-center gap-3 rounded-xl border border-cream-dark bg-white px-4 py-3 hover:bg-cream/50"
            >
              <span className="text-xl">{category.icon}</span>
              <span className="font-medium text-ink">{category.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {projects.length > 1 ? (
        <Card title="Активный проект">
          <select
            className="w-full rounded-xl border border-cream-dark bg-white px-3 py-2.5 text-sm"
            value={activeProject?.id ?? ''}
            onChange={(e) => setActiveProjectId(e.target.value)}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </Card>
      ) : null}
    </div>
  )
}
