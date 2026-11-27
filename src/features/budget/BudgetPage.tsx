import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '../auth/AuthProvider'
import { db } from '../../data/db/database'
import { formatMoneyAmount, formatMoneyInput } from '../../core/config/moodboard'
import { AddButton } from '../../core/ui/AddButton'
import { OverflowMenu, OverflowMenuItem } from '../../core/ui/OverflowMenu'
import { ProgressBar } from '../../core/ui/ProgressBar'
import { categoryRepository } from '../../data/repositories/categoryRepository'
import type { Category } from '../../core/types/entity'
import {
  allBudgetLines,
  budgetCategories,
  categoryPlanAmount,
  spentForCategory,
  spentFromLines,
  totalPlanFromCategories,
} from './budget'

const fieldClass =
  'rounded-xl border border-cream-dark bg-white px-3 py-2.5 text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'

export function BudgetPage() {
  const { activeProjectId } = useAuth()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const data = useLiveQuery(async () => {
    if (!activeProjectId) return { categories: [] as Category[], lines: [], busyIds: new Set<string>() }
    const [categories, items, tasks] = await Promise.all([
      categoryRepository.listByProject(activeProjectId),
      db.moodItems.where('projectId').equals(activeProjectId).toArray(),
      db.tasks.where('projectId').equals(activeProjectId).toArray(),
    ])
    const busyIds = new Set<string>()
    for (const task of tasks) {
      if (!task.deletedAt) busyIds.add(task.categoryId)
    }
    for (const item of items) {
      if (!item.deletedAt) busyIds.add(item.categoryId)
    }
    return {
      categories,
      lines: allBudgetLines(items, categories),
      busyIds,
    }
  }, [activeProjectId])

  if (!activeProjectId) {
    return <Navigate to="/" replace />
  }

  const categories = budgetCategories(data?.categories ?? [])
  const lines = data?.lines ?? []
  const planAmount = totalPlanFromCategories(categories)
  const spent = spentFromLines(lines)
  const remaining = planAmount ? planAmount - spent : 0
  const percent = planAmount > 0 ? Math.min(100, Math.round((spent / planAmount) * 100)) : 0

  function startEdit(category: Category) {
    const current = category.metadata?.budgetPlan
    setDraft(typeof current === 'string' ? formatMoneyInput(current) : '')
    setEditingId(category.id)
  }

  function saveEdit(categoryId: string) {
    if (!activeProjectId) return
    categoryRepository.setBudgetPlan(activeProjectId, categoryId, draft).catch(console.error)
    setEditingId(null)
    setDraft('')
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    if (!activeProjectId || !name.trim()) return

    setSubmitting(true)
    try {
      await categoryRepository.create(
        activeProjectId,
        { name, icon },
        { budgetCost: true },
      )
      setName('')
      setIcon('')
    } finally {
      setSubmitting(false)
    }
  }

  function handleRemove(category: Category) {
    if (!activeProjectId) return
    const keepInTasks = data?.busyIds.has(category.id)
    const ok = window.confirm(
      keepInTasks
        ? `Убрать «${category.name}» из бюджета?\n\nРаздел в задачах останется.`
        : `Удалить «${category.name}» из бюджета?`,
    )
    if (!ok) return
    if (keepInTasks) {
      categoryRepository.setBudgetCost(activeProjectId, category.id, false).catch(console.error)
      return
    }
    categoryRepository.remove(activeProjectId, category.id).catch(console.error)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          to="/"
          aria-label="На главную"
          className="shrink-0 text-2xl leading-none text-accent-dark hover:text-accent"
        >
          ←
        </Link>
        <h2 className="text-sm font-semibold leading-tight text-accent-dark">Бюджет</h2>
      </div>

      <div className="rounded-2xl border border-cream-dark bg-surface px-4 py-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-ink">Итого</p>
          {planAmount ? (
            <span className="text-xl font-semibold tabular-nums text-accent-dark">
              {formatMoneyAmount(remaining)}
            </span>
          ) : null}
        </div>
        <ProgressBar value={percent} className="h-1.5" />
        <p className="mt-1.5 text-xs text-muted">
          {planAmount
            ? `Потрачено ${percent}% от суммы планов по категориям`
            : 'Задайте план расхода в каждой категории'}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <div className="rounded-lg bg-cream/50 px-2 py-1.5 text-center">
            <p className="truncate text-sm font-semibold tabular-nums text-accent-dark">
              {planAmount ? formatMoneyAmount(planAmount) : '—'}
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
      </div>

      <form onSubmit={handleCreate} className="rounded-2xl border border-cream-dark bg-white p-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">Новая категория затрат</span>
          <div className="flex items-center gap-2">
            <input
              id="budgetCategoryName"
              name="budgetCategoryName"
              type="text"
              placeholder="Название"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={`min-w-0 flex-1 ${fieldClass}`}
            />
            <input
              id="budgetCategoryIcon"
              name="budgetCategoryIcon"
              type="text"
              placeholder=""
              value={icon}
              onChange={(event) => setIcon(event.target.value)}
              aria-label="Иконка"
              className={`w-14 shrink-0 text-center ${fieldClass}`}
            />
            <AddButton
              type="submit"
              busy={submitting}
              disabled={submitting || !name.trim()}
              aria-label="Добавить категорию затрат"
            />
          </div>
        </label>
      </form>

      <div className="space-y-2">
        {categories.map((category) => {
          const plan = categoryPlanAmount(category)
          const categorySpent = spentForCategory(lines, category.id)
          const editing = editingId === category.id

          return (
            <div
              key={category.id}
              className="relative rounded-2xl border border-cream-dark bg-white px-4 py-3"
            >
              <Link
                to={`/budget/${category.id}`}
                className="absolute inset-0 rounded-2xl"
                aria-label={`${category.name}: детализация расходов`}
              />
              <div className="pointer-events-none relative flex items-center gap-2">
                <span className="text-lg leading-none">{category.icon}</span>
                <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                  {category.name}
                </h3>
                <div className="pointer-events-auto relative z-10">
                  <OverflowMenu
                    ariaLabel="Действия"
                    widthClass="w-36"
                    triggerClassName="rounded-lg px-1.5 py-1 text-xl leading-none text-muted hover:bg-cream"
                  >
                    {(close) => (
                      <OverflowMenuItem
                        danger
                        onClick={() => {
                          close()
                          handleRemove(category)
                        }}
                      >
                        Удалить
                      </OverflowMenuItem>
                    )}
                  </OverflowMenu>
                </div>
              </div>
              <div className="pointer-events-none relative mt-2 grid grid-cols-2 gap-2">
                <label className="pointer-events-auto z-10 rounded-lg bg-cream/50 px-2 py-1.5">
                  <p className="text-[10px] text-muted">План расхода</p>
                  {editing ? (
                    <input
                      autoFocus
                      inputMode="numeric"
                      value={draft}
                      placeholder="0"
                      onChange={(event) => setDraft(formatMoneyInput(event.target.value))}
                      onBlur={() => saveEdit(category.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') saveEdit(category.id)
                        if (event.key === 'Escape') {
                          setEditingId(null)
                          setDraft('')
                        }
                      }}
                      className="w-full bg-transparent text-sm font-semibold tabular-nums text-accent-dark outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(category)}
                      className="w-full text-left text-sm font-semibold tabular-nums text-accent-dark"
                    >
                      {plan ? formatMoneyAmount(plan) : 'Задать'}
                    </button>
                  )}
                </label>
                <div className="pointer-events-none rounded-lg bg-cream/50 px-2 py-1.5">
                  <p className="text-[10px] text-muted">Потрачено</p>
                  <p className="text-sm font-semibold tabular-nums text-ink">
                    {categorySpent ? formatMoneyAmount(categorySpent) : '—'}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
