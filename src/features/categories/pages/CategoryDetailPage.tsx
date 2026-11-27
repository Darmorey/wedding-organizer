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
import { canvasAllowsCards, moodBoardMode, placeBoardKind } from '../../../core/config/moodboard'
import {
  DEADLINE_PHASES,
  deadlinePhaseForTitle,
  deadlinePhaseOf,
  defaultDeadlineForCategory,
  type DeadlinePhase,
} from '../../../core/config/deadlines'
import { examplesForCategory } from '../../../core/config/taskExamples'
import { TaskExamplesPanel } from '../components/TaskExamplesPanel'

export function CategoryDetailPage() {
  const { categoryId = '' } = useParams()
  const { activeProjectId } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [adding, setAdding] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDeadline, setTaskDeadline] = useState<DeadlinePhase>('m12_9')
  const addInputRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<'tasks' | 'mood'>('tasks')
  const [examplesOpen, setExamplesOpen] = useState(false)

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
  const placeKind = placeBoardKind(category.name)
  const exampleTasks = examplesForCategory(category.name)

  function openAdd() {
    setAdding(true)
    setTaskTitle('')
    setTaskDeadline(defaultDeadlineForCategory(category.name))
    requestAnimationFrame(() => addInputRef.current?.focus())
  }

  function cancelAdd() {
    setAdding(false)
    setTaskTitle('')
  }

  async function submitAdd() {
    if (!activeProjectId || submitting || !taskTitle.trim() || !taskDeadline) return

    setSubmitting(true)
    try {
      await taskRepository.create(activeProjectId, categoryId, taskTitle.trim(), taskDeadline)
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
        <div className="flex items-center gap-2">
          <Link
            to="/categories"
            aria-label="К категориям"
            className="shrink-0 text-2xl leading-none text-accent-dark hover:text-accent"
          >
            ←
          </Link>
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
        <CanvasMoodBoard
          projectId={activeProjectId}
          categoryId={categoryId}
          allowCards={canvasAllowsCards(category.name)}
        />
      ) : showMoodBoard && tab === 'mood' ? (
        <MoodBoard
          projectId={activeProjectId}
          categoryId={categoryId}
          variant={placeKind ?? 'media'}
        />
      ) : (
      <div>
        <div className={adding ? 'mb-2' : 'mb-2 flex items-center justify-end gap-2'}>
          {exampleTasks.length > 0 && !adding ? (
            <button
              type="button"
              onClick={() => setExamplesOpen((open) => !open)}
              className="mr-auto text-sm text-accent-dark hover:text-accent"
            >
              Пример задач
            </button>
          ) : null}
          {adding ? (
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center gap-2">
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
                  aria-label="Добавить задачу"
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
              </div>
              <label className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-xs text-muted">Срок</span>
                <select
                  value={taskDeadline}
                  disabled={submitting}
                  onChange={(event) => setTaskDeadline(event.target.value as DeadlinePhase)}
                  className="min-w-0 flex-1 rounded-lg border border-cream-dark bg-white px-2 py-1.5 text-xs text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  {DEADLINE_PHASES.map((phase) => (
                    <option key={phase.id} value={phase.id}>
                      {phase.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <AddButton
              type="button"
              disabled={submitting}
              aria-label="Добавить подзадачу"
              onClick={openAdd}
            />
          )}
        </div>
        {examplesOpen && exampleTasks.length > 0 && !adding ? (
          <TaskExamplesPanel
            examples={exampleTasks}
            existingTitles={(tasks ?? []).map((task) => task.title)}
            disabled={submitting}
            onAdd={async (titles) => {
              setSubmitting(true)
              try {
                const existing = new Set((tasks ?? []).map((task) => task.title.trim().toLowerCase()))
                for (const title of titles) {
                  if (existing.has(title.trim().toLowerCase())) continue
                  const phase =
                    deadlinePhaseForTitle(title, category.name) ?? defaultDeadlineForCategory(category.name)
                  await taskRepository.create(activeProjectId, categoryId, title, phase)
                  existing.add(title.trim().toLowerCase())
                }
              } finally {
                setSubmitting(false)
              }
            }}
          />
        ) : null}
        <TaskChecklist
          tasks={tasks ?? []}
          categoryName={category.name}
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
          onDeadline={(taskId, phase) => {
            taskRepository.updateDeadline(activeProjectId, taskId, phase).catch(console.error)
          }}
          onAddSubtask={async (parentId, title) => {
            const parent = (tasks ?? []).find((task) => task.id === parentId)
            const phase =
              (parent ? deadlinePhaseOf(parent, category.name) : null) ??
              defaultDeadlineForCategory(category.name)
            await taskRepository.create(activeProjectId, categoryId, title, phase, parentId)
          }}
        />
      </div>
      )}
    </div>
  )
}
