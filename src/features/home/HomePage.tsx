import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '../auth/AuthProvider'
import { ProgressBar } from '../../core/ui/ProgressBar'
import { db } from '../../data/db/database'
import { categoryRepository } from '../../data/repositories/categoryRepository'

export function HomePage() {
  const { activeProjectId } = useAuth()

  const stats = useLiveQuery(async () => {
    if (!activeProjectId) return { total: 0, done: 0 }
    const tasks = await db.tasks.where('projectId').equals(activeProjectId).toArray()
    const active = tasks.filter((task) => !task.deletedAt)
    return {
      total: active.length,
      done: active.filter((task) => task.done).length,
    }
  }, [activeProjectId])

  const categories = useLiveQuery(async () => {
    if (!activeProjectId) return []
    return categoryRepository.listByProject(activeProjectId)
  }, [activeProjectId])

  const percent =
    stats && stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-cream-dark bg-surface px-4 py-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-label text-[10px] font-medium uppercase tracking-wide text-coral">
              Задачи
            </p>
            <p className="text-sm font-medium text-ink">Общий прогресс</p>
          </div>
          <span className="shrink-0 text-2xl font-semibold tabular-nums text-accent-dark">
            {percent}%
          </span>
        </div>
        <ProgressBar value={percent} className="h-1.5" />
        <p className="mt-1.5 text-xs text-muted">
          {stats?.done ?? 0} из {stats?.total ?? 0} выполнено
        </p>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-accent-dark">Категории</h2>
          <Link to="/categories" className="text-sm text-accent-dark hover:text-accent">
            Все →
          </Link>
        </div>
        <div className="space-y-2">
          {(categories ?? []).map((category) => (
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

    </div>
  )
}
