import { useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '../auth/AuthProvider'
import { db } from '../../data/db/database'
import { formatMoneyAmount, formatMoneyInput, parseMoneyAmount } from '../../core/config/moodboard'
import { AddButton } from '../../core/ui/AddButton'
import { EmptyState } from '../../core/ui/EmptyState'
import { OverflowMenu, OverflowMenuItem } from '../../core/ui/OverflowMenu'
import { ProgressBar } from '../../core/ui/ProgressBar'
import { categoryRepository } from '../../data/repositories/categoryRepository'
import {
  allBudgetLines,
  categoryExpenses,
  categoryHasBudget,
  categoryPlanAmount,
  spentFromLines,
  type BudgetExpense,
} from './budget'

const fieldClass =
  'rounded-xl border border-cream-dark bg-white px-3 py-2.5 text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'

export function BudgetCategoryPage() {
  const { categoryId = '' } = useParams()
  const { activeProjectId } = useAuth()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingPlan, setEditingPlan] = useState(false)
  const [planDraft, setPlanDraft] = useState('')
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [expenseDraft, setExpenseDraft] = useState({ name: '', amount: '' })

  const data = useLiveQuery(async () => {
    if (!activeProjectId || !categoryId) return null
    const [category, items, categories] = await Promise.all([
      categoryRepository.getById(activeProjectId, categoryId),
      db.moodItems.where('projectId').equals(activeProjectId).toArray(),
      categoryRepository.listByProject(activeProjectId),
    ])
    if (!category) return { category: null, lines: [], expenses: [] as BudgetExpense[] }
    return {
      category,
      lines: allBudgetLines(items, categories).filter((line) => line.categoryId === categoryId),
      expenses: categoryExpenses(category),
    }
  }, [activeProjectId, categoryId])

  if (!activeProjectId) {
    return <Navigate to="/" replace />
  }

  if (data === undefined) {
    return <p className="text-muted">Загрузка…</p>
  }

  if (!data?.category || !categoryHasBudget(data.category)) {
    return <Navigate to="/budget" replace />
  }

  const category = data.category
  const plan = categoryPlanAmount(category)
  const spent = spentFromLines(data.lines)
  const remaining = plan ? plan - spent : 0
  const percent = plan > 0 ? Math.min(100, Math.round((spent / plan) * 100)) : 0
  const venueLines = data.lines.filter((line) => line.source === 'venue')

  function startPlanEdit() {
    setPlanDraft(plan ? formatMoneyInput(String(plan)) : '')
    setEditingPlan(true)
  }

  function savePlan() {
    if (!activeProjectId) return
    categoryRepository.setBudgetPlan(activeProjectId, categoryId, planDraft).catch(console.error)
    setEditingPlan(false)
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    if (!activeProjectId || !name.trim() || !parseMoneyAmount(amount)) return

    setSubmitting(true)
    try {
      await categoryRepository.addExpense(activeProjectId, categoryId, { name, amount })
      setName('')
      setAmount('')
    } finally {
      setSubmitting(false)
    }
  }

  function startExpenseEdit(expense: BudgetExpense) {
    setEditingExpenseId(expense.id)
    setExpenseDraft({
      name: expense.name,
      amount: formatMoneyInput(expense.amount),
    })
  }

  function saveExpenseEdit() {
    if (!activeProjectId || !editingExpenseId) return
    categoryRepository
      .updateExpense(activeProjectId, categoryId, editingExpenseId, expenseDraft)
      .catch(console.error)
    setEditingExpenseId(null)
  }

  function removeExpense(expense: BudgetExpense) {
    if (!activeProjectId) return
    const ok = window.confirm(`Удалить трату «${expense.name}»?`)
    if (!ok) return
    categoryRepository.removeExpense(activeProjectId, categoryId, expense.id).catch(console.error)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          to="/budget"
          aria-label="К бюджету"
          className="shrink-0 text-2xl leading-none text-accent-dark hover:text-accent"
        >
          ←
        </Link>
        <span className="text-lg leading-none">{category.icon}</span>
        <h2 className="min-w-0 truncate text-sm font-semibold leading-tight text-accent-dark">
          {category.name}
        </h2>
      </div>

      <div className="rounded-2xl border border-cream-dark bg-surface px-4 py-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-ink">По категории</p>
          {plan ? (
            <span className="text-xl font-semibold tabular-nums text-accent-dark">
              {formatMoneyAmount(remaining)}
            </span>
          ) : null}
        </div>
        <ProgressBar value={percent} className="h-1.5" />
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <label className="rounded-lg bg-cream/50 px-2 py-1.5 text-center">
            <p className="truncate text-[10px] text-muted">План</p>
            {editingPlan ? (
              <input
                autoFocus
                inputMode="numeric"
                value={planDraft}
                placeholder="0"
                onChange={(event) => setPlanDraft(formatMoneyInput(event.target.value))}
                onBlur={savePlan}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') savePlan()
                  if (event.key === 'Escape') setEditingPlan(false)
                }}
                className="w-full bg-transparent text-center text-sm font-semibold tabular-nums text-accent-dark outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={startPlanEdit}
                className="w-full text-sm font-semibold tabular-nums text-accent-dark"
              >
                {plan ? formatMoneyAmount(plan) : 'Задать'}
              </button>
            )}
          </label>
          <div className="rounded-lg bg-cream/50 px-2 py-1.5 text-center">
            <p className="truncate text-[10px] text-muted">Потрачено</p>
            <p className="truncate text-sm font-semibold tabular-nums text-ink">
              {spent ? formatMoneyAmount(spent) : '—'}
            </p>
          </div>
          <div className="rounded-lg bg-cream/50 px-2 py-1.5 text-center">
            <p className="truncate text-[10px] text-muted">Остаток</p>
            <p
              className={[
                'truncate text-sm font-semibold tabular-nums',
                remaining < 0 ? 'text-red-600' : 'text-ink',
              ].join(' ')}
            >
              {plan ? formatMoneyAmount(remaining) : '—'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleCreate} className="rounded-2xl border border-cream-dark bg-white p-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">Новая трата</span>
          <div className="flex items-center gap-2">
            <input
              id="expenseName"
              name="expenseName"
              type="text"
              placeholder="Например: депозит"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={`min-w-0 flex-1 ${fieldClass}`}
            />
            <input
              id="expenseAmount"
              name="expenseAmount"
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={(event) => setAmount(formatMoneyInput(event.target.value))}
              aria-label="Сумма"
              className={`w-28 shrink-0 text-right ${fieldClass}`}
            />
            <AddButton
              type="submit"
              busy={submitting}
              disabled={submitting || !name.trim() || !parseMoneyAmount(amount)}
              aria-label="Добавить трату"
            />
          </div>
        </label>
      </form>

      {venueLines.length === 0 && data.expenses.length === 0 ? (
        <EmptyState
          title="Трат пока нет"
          description="Добавьте конкретные расходы — депозит, доплата, репетиционный ужин."
        />
      ) : (
        <ul className="space-y-2">
          {venueLines.map((line) => (
            <li
              key={line.id}
              className="rounded-2xl border border-cream-dark bg-white px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{line.name}</p>
                  <p className="text-[10px] text-muted">Выбрано в подборке</p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                  {formatMoneyAmount(line.amount)}
                </span>
              </div>
            </li>
          ))}
          {data.expenses.map((expense) => {
            const editing = editingExpenseId === expense.id
            const expenseAmount = parseMoneyAmount(expense.amount)

            return (
              <li
                key={expense.id}
                className="rounded-2xl border border-cream-dark bg-white px-4 py-3"
              >
                {editing ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={expenseDraft.name}
                      onChange={(event) =>
                        setExpenseDraft((current) => ({ ...current, name: event.target.value }))
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') saveExpenseEdit()
                        if (event.key === 'Escape') setEditingExpenseId(null)
                      }}
                      className={`min-w-0 flex-1 ${fieldClass} py-1.5`}
                    />
                    <input
                      inputMode="numeric"
                      value={expenseDraft.amount}
                      onChange={(event) =>
                        setExpenseDraft((current) => ({
                          ...current,
                          amount: formatMoneyInput(event.target.value),
                        }))
                      }
                      onBlur={saveExpenseEdit}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') saveExpenseEdit()
                        if (event.key === 'Escape') setEditingExpenseId(null)
                      }}
                      className={`w-28 shrink-0 text-right ${fieldClass} py-1.5`}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startExpenseEdit(expense)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm font-medium text-ink">{expense.name}</p>
                      <p className="text-sm font-semibold tabular-nums text-ink">
                        {expenseAmount ? formatMoneyAmount(expenseAmount) : 'Задать сумму'}
                      </p>
                    </button>
                    <OverflowMenu
                      ariaLabel="Действия"
                      widthClass="w-36"
                      triggerClassName="rounded-lg px-1.5 py-1 text-xl leading-none text-muted hover:bg-cream"
                    >
                      {(close) => (
                        <>
                          <OverflowMenuItem
                            onClick={() => {
                              close()
                              startExpenseEdit(expense)
                            }}
                          >
                            Изменить
                          </OverflowMenuItem>
                          <OverflowMenuItem
                            danger
                            onClick={() => {
                              close()
                              removeExpense(expense)
                            }}
                          >
                            Удалить
                          </OverflowMenuItem>
                        </>
                      )}
                    </OverflowMenu>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
