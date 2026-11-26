import { useRef, useState, type KeyboardEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '../../auth/AuthProvider'
import { categoryRepository } from '../../../data/repositories/categoryRepository'
import { taskRepository } from '../../../data/repositories/taskRepository'
import { TaskChecklist } from '../components/TaskChecklist'
import { MoodBoard } from '../components/MoodBoard'
import { CanvasMoodBoard } from '../components/CanvasMoodBoard'
import { AddButton } from '../../../core/ui/AddButton'
import { ProgressBar } from '../../../core/ui/ProgressBar'
import { moodBoardMode } from '../../../core/config/moodboard'

export function CategoryDetailPage() {
  const { categoryId = '' } = useParams()
  const { activeProjectId } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [adding, setAdding] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const addInputRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<'tasks' | 'mood'>('tasks')

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
  const boardMode = moodBoardMode(category.name)
  const showMoodBoard = boardMode !== 'none'

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
    <div className="space-y-3">
      <div>
        <Link to="/categories" className="text-[11px] leading-none text-accent-dark hover:text-accent">
          ← К категориям
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-lg leading-none">{category.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="truncate text-sm font-semibold leading-tight text-accent-dark">
                {category.name}
              </h2>
              <p className="shrink-0 text-[10px] leading-none text-muted">
                {done} из {total} · {percent}%
              </p>
            </div>
            <ProgressBar value={percent} className="mt-1 h-1" />
          </div>
        </div>
      </div>

      {showMoodBoard ? (
        <div className="flex gap-2 rounded-xl bg-cream p-1">
          <button
            type="button"
            className={[
              'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              tab === 'tasks' ? 'bg-white text-accent-dark shadow-sm' : 'text-muted',
            ].join(' ')}
            onClick={() => setTab('tasks')}
          >
            Задачи
          </button>
          <button
            type="button"
            className={[
              'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              tab === 'mood' ? 'bg-white text-accent-dark shadow-sm' : 'text-muted',
            ].join(' ')}
            onClick={() => setTab('mood')}
          >
            Мудборд
          </button>
        </div>
      ) : null}

      {showMoodBoard && tab === 'mood' && boardMode === 'canvas' ? (
        <CanvasMoodBoard projectId={activeProjectId} categoryId={categoryId} />
      ) : showMoodBoard && tab === 'mood' ? (
        <MoodBoard projectId={activeProjectId} categoryId={categoryId} />
      ) : (
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
              <AddButton
                type="button"
                busy={submitting}
                disabled={submitting || !taskTitle.trim()}
                aria-label="Добавить подзадачу"
                onClick={() => void submitAdd()}
              />
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
            <AddButton
              type="button"
              disabled={submitting}
              aria-label="Добавить подзадачу"
              onClick={openAdd}
            />
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
      )}
    </div>
  )
}
