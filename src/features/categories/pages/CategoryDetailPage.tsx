import { useRef, useState, type KeyboardEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '../../auth/AuthProvider'
import { categoryRepository } from '../../../data/repositories/categoryRepository'
import { taskRepository } from '../../../data/repositories/taskRepository'
import { TaskChecklist } from '../components/TaskChecklist'
import { Button } from '../../../core/ui/Button'
import { ProgressBar } from '../../../core/ui/ProgressBar'

export function CategoryDetailPage() {
  const { categoryId = '' } = useParams()
  const { activeProjectId } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [adding, setAdding] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const addInputRef = useRef<HTMLInputElement>(null)

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

  function openAdd() {
    setAdding(true)
    setTaskTitle('')
    requestAnimationFrame(() => addInputRef.current?.focus())
  }

  function cancelAdd() {
    setAdding(false)
    setTaskTitle('')
  }

  async function submitAdd() {
    if (!activeProjectId || submitting || !taskTitle.trim()) return

    setSubmitting(true)
    try {
      await taskRepository.create(activeProjectId, categoryId, taskTitle.trim())
      setTaskTitle('')
      requestAnimationFrame(() => addInputRef.current?.focus())
    } finally {
      setSubmitting(false)
    }
  }

  function handleAddKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void submitAdd()
    }
    if (event.key === 'Escape') cancelAdd()
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

      <div>
        <div className="mb-2 flex items-center justify-end gap-2">
          {adding ? (
            <>
              <input
                ref={addInputRef}
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                onKeyDown={handleAddKeyDown}
                placeholder="Что нужно сделать?"
                autoComplete="off"
                disabled={submitting}
                className="min-w-0 flex-1 rounded-xl border border-cream-dark bg-white px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
              <Button
                type="button"
                disabled={submitting || !taskTitle.trim()}
                className="shrink-0 px-4"
                aria-label="Добавить подзадачу"
                onClick={() => void submitAdd()}
              >
                {submitting ? '…' : '+'}
              </Button>
              <button
                type="button"
                aria-label="Отмена"
                disabled={submitting}
                onClick={cancelAdd}
                className="shrink-0 rounded-lg px-2 py-1 text-lg text-muted hover:bg-cream"
              >
                ×
              </button>
            </>
          ) : (
            <Button
              type="button"
              disabled={submitting}
              className="shrink-0 px-4"
              aria-label="Добавить подзадачу"
              onClick={openAdd}
            >
              +
            </Button>
          )}
        </div>
        <TaskChecklist
          tasks={tasks ?? []}
          onToggle={(taskId) => {
            taskRepository.toggleDone(activeProjectId, taskId).catch(console.error)
          }}
          onRemove={(taskId) => {
            taskRepository.remove(activeProjectId, taskId).catch(console.error)
          }}
          onRename={(taskId, title) => {
            taskRepository.updateTitle(activeProjectId, taskId, title).catch(console.error)
          }}
          onReorder={(orderedIds) => {
            taskRepository.reorder(activeProjectId, categoryId, orderedIds).catch(console.error)
          }}
        />
      </div>
    </div>
  )
}
