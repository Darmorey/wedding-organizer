import { useMemo, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../data/db/database'
import { useAuth } from '../../auth/AuthProvider'
import { categoryRepository } from '../../../data/repositories/categoryRepository'
import { CategoryCard } from '../components/CategoryCard'
import { Button } from '../../../core/ui/Button'
import { Input } from '../../../core/ui/Input'
import { EmptyState } from '../../../core/ui/EmptyState'

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
        <h2 className="text-xl font-semibold text-accent-dark">Категории</h2>
        <p className="mt-1 text-sm text-muted">Чек-листы по разделам подготовки свадьбы</p>
      </div>

      <form onSubmit={handleCreate} className="space-y-3 rounded-2xl border border-cream-dark bg-white p-4">
        <Input
          label="Новая категория"
          name="categoryName"
          placeholder="Название"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Иконка"
          name="categoryIcon"
          placeholder="📋"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
        />
        <Button type="submit" disabled={submitting || !name.trim()}>
          Добавить категорию
        </Button>
      </form>

      {list.length === 0 ? (
        <EmptyState
          title="Категорий пока нет"
          description="Они появятся после синхронизации или добавьте свою первую категорию."
        />
      ) : (
        <div className="space-y-3">
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
