import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '../auth/AuthProvider'
import { ProgressBar } from '../../core/ui/ProgressBar'
import { db } from '../../data/db/database'
import { HomeBudgetCard } from './HomeBudgetCard'

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

      {activeProjectId ? <HomeBudgetCard projectId={activeProjectId} /> : null}

      <Link
        to="/guests"
        className="block rounded-2xl border border-cream-dark bg-surface px-4 py-3 shadow-sm hover:bg-cream/30"
      >
        <p className="font-label text-[10px] font-medium uppercase tracking-wide text-coral">Гости</p>
        <p className="mt-1 text-sm font-medium text-ink">Список гостей и RSVP</p>
        <p className="mt-1 text-xs text-muted">Открыть раздел</p>
      </Link>
    </div>
  )
}
