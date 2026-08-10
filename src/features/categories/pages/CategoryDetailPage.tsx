import { useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '../../auth/AuthProvider'
import { categoryRepository } from '../../../data/repositories/categoryRepository'
import { taskRepository } from '../../../data/repositories/taskRepository'
import { TaskChecklist } from '../components/TaskChecklist'
import { Button } from '../../../core/ui/Button'
import { Input } from '../../../core/ui/Input'
import { ProgressBar } from '../../../core/ui/ProgressBar'

export function CategoryDetailPage() {
  const { categoryId = '' } = useParams()
  const { activeProjectId } = useAuth()
  const [taskTitle, setTaskTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const category = useLiveQuery(async () => {
    if (!activeProjectId || !categoryId) return undefined
    return categoryRepository.getById(activeProjectId, categoryId)
  }, [activeProjectId, categoryId])

  const tasks = useLiveQuery(async () => {
    if (!activeProjectId || !categoryId) return []
    return taskRepository.listByCategory(activeProjectId, categoryId)
  }, [activeProjectId, categoryId])

  if (!activeProjectId) {
    return <Navigate to="/" replace />
  }

  if (category === undefined) {
    return <p className="text-muted">Загрузка…</p>
  }

  if (!category) {
    return <Navigate to="/categories" replace />
  }

  const done = (tasks ?? []).filter((task) => task.done).length
  const total = tasks?.length ?? 0
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)

  async function handleAddTask(e: FormEvent) {
    e.preventDefault()
    if (!activeProjectId || !taskTitle.trim()) return

    setSubmitting(true)
    try {
      await taskRepository.create(activeProjectId, categoryId, taskTitle)
      setTaskTitle('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/categories" className="text-sm text-accent-dark hover:text-accent">
          ← К категориям
        </Link>
        <div className="mt-3 flex items-start gap-3">
          <span className="text-3xl">{category.icon}</span>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-accent-dark">{category.name}</h2>
            <p className="mt-1 text-sm text-muted">
              {done} из {total} выполнено · {percent}%
            </p>
            <ProgressBar value={percent} className="mt-3" />
          </div>
        </div>
      </div>

      <TaskChecklist
        tasks={tasks ?? []}
        onToggle={(taskId) => {
          taskRepository.toggleDone(activeProjectId, taskId).catch(console.error)
        }}
        onRemove={(taskId) => {
          taskRepository.remove(activeProjectId, taskId).catch(console.error)
        }}
      />

      <form onSubmit={handleAddTask} className="flex gap-2">
        <Input
          label="Новая задача"
          name="taskTitle"
          placeholder="Что нужно сделать?"
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          className="flex-1"
        />
        <div className="self-end">
          <Button type="submit" disabled={submitting || !taskTitle.trim()}>
            Добавить
          </Button>
        </div>
      </form>
    </div>
  )
}
