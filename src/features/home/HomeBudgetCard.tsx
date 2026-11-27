import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db/database'
import { formatMoneyAmount } from '../../core/config/moodboard'
import { ProgressBar } from '../../core/ui/ProgressBar'
import { categoryRepository } from '../../data/repositories/categoryRepository'
import { allBudgetLines, spentFromLines, totalPlanFromCategories } from '../budget/budget'

interface HomeBudgetCardProps {
  projectId: string
}

export function HomeBudgetCard({ projectId }: HomeBudgetCardProps) {
  const summary = useLiveQuery(async () => {
    const [categories, items] = await Promise.all([
      categoryRepository.listByProject(projectId),
      db.moodItems.where('projectId').equals(projectId).toArray(),
    ])
    const lines = allBudgetLines(items, categories)
    return {
      plan: totalPlanFromCategories(categories),
      spent: spentFromLines(lines),
    }
  }, [projectId])

  const planAmount = summary?.plan ?? 0
  const spent = summary?.spent ?? 0
  const remaining = planAmount ? planAmount - spent : 0
  const percent = planAmount > 0 ? Math.min(100, Math.round((spent / planAmount) * 100)) : 0

  return (
    <Link
      to="/budget"
      className="block rounded-2xl border border-cream-dark bg-surface px-4 py-3 shadow-sm hover:bg-cream/30"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-label text-[10px] font-medium uppercase tracking-wide text-coral">
            Бюджет
          </p>
          <p className="text-sm font-medium text-ink">План и расходы</p>
        </div>
        {planAmount ? (
          <span className="shrink-0 text-right text-xl font-semibold tabular-nums text-accent-dark">
            {formatMoneyAmount(remaining)}
          </span>
        ) : null}
      </div>
      <ProgressBar value={percent} className="h-1.5" />
      <p className="mt-1.5 text-xs text-muted">
        {planAmount ? `Потрачено ${percent}% плана` : 'Нажмите, чтобы задать план по категориям'}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <div className="rounded-lg bg-cream/50 px-2 py-1.5 text-center">
          <p className="truncate text-sm font-semibold tabular-nums text-accent-dark">
            {planAmount ? formatMoneyAmount(planAmount) : 'Задать'}
          </p>
          <p className="truncate text-[10px] text-muted">План</p>
        </div>
        <div className="rounded-lg bg-cream/50 px-2 py-1.5 text-center">
          <p className="truncate text-sm font-semibold tabular-nums text-ink">
            {spent ? formatMoneyAmount(spent) : '—'}
          </p>
          <p className="truncate text-[10px] text-muted">Потрачено</p>
        </div>
        <div className="rounded-lg bg-cream/50 px-2 py-1.5 text-center">
          <p
            className={[
              'truncate text-sm font-semibold tabular-nums',
              remaining < 0 ? 'text-red-600' : 'text-ink',
            ].join(' ')}
          >
            {planAmount ? formatMoneyAmount(remaining) : '—'}
          </p>
          <p className="truncate text-[10px] text-muted">Остаток</p>
        </div>
      </div>
    </Link>
  )
}
