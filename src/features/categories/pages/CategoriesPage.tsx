import { useMemo, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../data/db/database'
import { useAuth } from '../../auth/AuthProvider'
import { categoryRepository } from '../../../data/repositories/categoryRepository'
import { CategoryCard } from '../components/CategoryCard'
import { Button } from '../../../core/ui/Button'
import { EmptyState } from '../../../core/ui/EmptyState'

const fieldClass =
  'rounded-xl border border-cream-dark bg-white px-3 py-2.5 text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'

export function CategoriesPage() {
  const { activeProjectId } = useAuth()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📋')
  const [submitting, setSubmitting] = useState(false)

  const categories = useLiveQuery(async () => {
    if (!activeProjectId) return []
    return categoryRepository.listByProject(activeProjectId)
  }, [activeProjectId])

  const tasks = useLiveQuery(async () => {
    if (!activeProjectId) return []
    return db.tasks.where('projectId').equals(activeProjectId).toArray()
  }, [activeProjectId])

  const statsByCategory = useMemo(() => {
    const map = new Map<string, { done: number; total: number }>()
    for (const task of tasks ?? []) {
      if (task.deletedAt) continue
      const current = map.get(task.categoryId) ?? { done: 0, total: 0 }
      current.total += 1
      if (task.done) current.done += 1
      map.set(task.categoryId, current)
    }
    return map
  }, [tasks])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!activeProjectId || !name.trim()) return

    setSubmitting(true)
    try {
      await categoryRepository.create(activeProjectId, { name, icon })
      setName('')
      setIcon('📋')
    } finally {
      setSubmitting(false)
    }
  }

  const list = categories ?? []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-accent-dark">Задачи</h2>
        <p className="mt-1 text-sm text-muted">Чек-листы по разделам подготовки свадьбы</p>
      </div>

      <form onSubmit={handleCreate} className="rounded-2xl border border-cream-dark bg-white p-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">Новая задача</span>
          <div className="flex items-center gap-2">
            <input
              id="categoryName"
              name="categoryName"
              type="text"
              placeholder="Название"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`min-w-0 flex-1 ${fieldClass}`}
            />
            <input
              id="categoryIcon"
              name="categoryIcon"
              type="text"
              placeholder="📋"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              aria-label="Иконка"
              className={`w-14 shrink-0 text-center ${fieldClass}`}
            />
            <Button
              type="submit"
              disabled={submitting || !name.trim()}
              className="shrink-0 px-4"
              aria-label="Добавить задачу"
            >
              {submitting ? '…' : '+'}
            </Button>
          </div>
        </label>
      </form>

      {list.length === 0 ? (
        <EmptyState
          title="Категорий пока нет"
          description="Они появятся после синхронизации или добавьте свою первую категорию."
        />
      ) : (
        <div className="space-y-4">
          {list.map((category) => {
            const stats = statsByCategory.get(category.id) ?? { done: 0, total: 0 }
            return (
              <CategoryCard
                key={category.id}
                category={category}
                done={stats.done}
                total={stats.total}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
