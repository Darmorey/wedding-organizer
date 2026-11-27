import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '../auth/AuthProvider'
import { db } from '../../data/db/database'
import { taskRepository } from '../../data/repositories/taskRepository'
import {
  DEADLINE_PHASES,
  deadlinePhaseOf,
  type DeadlinePhase,
} from '../../core/config/deadlines'
import { ProgressBar } from '../../core/ui/ProgressBar'
import { taskParentId } from '../../core/utils/taskTree'
import type { Category, Task } from '../../core/types/entity'

export function DeadlinesPage() {
  const { activeProjectId } = useAuth()
  const [open, setOpen] = useState<Record<string, boolean>>({})

  const data = useLiveQuery(async () => {
    if (!activeProjectId) return { tasks: [] as Task[], categories: [] as Category[] }
    const [tasks, categories] = await Promise.all([
      db.tasks.where('projectId').equals(activeProjectId).toArray(),
      db.categories.where('projectId').equals(activeProjectId).toArray(),
    ])
    return {
      tasks: tasks.filter((task) => !task.deletedAt),
      categories: categories.filter((category) => !category.deletedAt),
    }
  }, [activeProjectId])

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>()
    for (const category of data?.categories ?? []) map.set(category.id, category)
    return map
  }, [data?.categories])

  const taskById = useMemo(() => {
    const map = new Map<string, Task>()
    for (const task of data?.tasks ?? []) map.set(task.id, task)
    return map
  }, [data?.tasks])

  const grouped = useMemo(() => {
    const buckets = new Map<DeadlinePhase | 'none', Task[]>()
    for (const phase of DEADLINE_PHASES) buckets.set(phase.id, [])
    buckets.set('none', [])
    for (const task of data?.tasks ?? []) {
      const category = categoryById.get(task.categoryId)
      const phase = deadlinePhaseOf(task, category?.name) ?? 'none'
      buckets.get(phase)?.push(task)
    }
    for (const list of buckets.values()) {
      list.sort((a, b) => Number(a.done) - Number(b.done) || a.sortOrder - b.sortOrder)
    }
    return buckets
  }, [data?.tasks, categoryById])

  const unscheduled = grouped.get('none') ?? []

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-accent-dark">Дедлайны</h2>
        <p className="mt-1 text-sm text-muted">Те же задачи, что в разделах, разложенные по сроку до свадьбы</p>
      </div>

      {DEADLINE_PHASES.map((phase) => {
        const tasks = grouped.get(phase.id) ?? []
        const done = tasks.filter((task) => task.done).length
        const expanded = open[phase.id] ?? false
        return (
          <DeadlineSection
            key={phase.id}
            title={phase.label}
            hint={phase.hint}
            tasks={tasks}
            done={done}
            expanded={expanded}
            categoryById={categoryById}
            taskById={taskById}
            projectId={activeProjectId}
            emptyText={
              phase.id === 'wedding_day'
                ? 'На сам день лучше не оставлять новые дела — только тайминг и человек, который всё держит.'
                : 'Пока нет задач на этот срок.'
            }
            onToggleOpen={() => setOpen((current) => ({ ...current, [phase.id]: !expanded }))}
          />
        )
      })}

      {unscheduled.length > 0 ? (
        <DeadlineSection
          title="Без срока"
          hint="Свои задачи, которые ещё не попали в план по месяцам"
          tasks={unscheduled}
          done={unscheduled.filter((task) => task.done).length}
          expanded={open.none ?? false}
          categoryById={categoryById}
          taskById={taskById}
          projectId={activeProjectId}
          emptyText=""
          onToggleOpen={() => setOpen((current) => ({ ...current, none: !(open.none ?? false) }))}
        />
      ) : null}
    </div>
  )
}

function DeadlineSection({
  title,
  hint,
  tasks,
  done,
  expanded,
  categoryById,
  taskById,
  projectId,
  emptyText,
  onToggleOpen,
}: {
  title: string
  hint: string
  tasks: Task[]
  done: number
  expanded: boolean
  categoryById: Map<string, Category>
  taskById: Map<string, Task>
  projectId: string | null
  emptyText: string
  onToggleOpen: () => void
}) {
  const total = tasks.length
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)

  return (
    <section className="overflow-hidden rounded-2xl border border-cream-dark bg-white">
      <button
        type="button"
        aria-expanded={expanded}
        aria-label={expanded ? `Скрыть задачи: ${title}` : `Показать задачи: ${title}`}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-cream/60"
        onClick={onToggleOpen}
      >
        <span
          aria-hidden
          className={[
            'mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-accent-dark transition-transform duration-200',
            expanded ? 'rotate-90' : '',
          ].join(' ')}
        >
          <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden>
            <path
              d="M7.25 4.75 12.5 10l-5.25 5.25"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink">{title}</h3>
            <span className="shrink-0 text-[11px] text-muted">
              {done} из {total}
            </span>
          </div>
          {expanded ? (
            <>
              <p className="mt-1 text-xs text-muted">{hint}</p>
              {total > 0 ? <ProgressBar value={percent} className="mt-1 h-1" /> : null}
            </>
          ) : null}
        </div>
      </button>
      {expanded ? (
        <ul className="border-t border-cream-dark">
          {tasks.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">{emptyText}</li>
          ) : (
            tasks.map((task) => {
              const category = categoryById.get(task.categoryId)
              const parentTitle = taskById.get(taskParentId(task) ?? '')?.title
              return (
                <li key={task.id} className="flex items-start gap-2 border-b border-cream-dark/70 px-3 py-2 last:border-b-0">
                  <button
                    type="button"
                    aria-pressed={task.done}
                    aria-label={task.done ? 'Отметить невыполненной' : 'Отметить выполненной'}
                    className={[
                      'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border text-[11px]',
                      task.done ? 'border-accent bg-accent text-white' : 'border-cream-dark bg-white text-transparent',
                    ].join(' ')}
                    onClick={() => {
                      if (!projectId) return
                      taskRepository.toggleDone(projectId, task.id).catch(console.error)
                    }}
                  >
                    ✓
                  </button>
                  <div className="min-w-0 flex-1">
                    {category ? (
                      <Link
                        to={`/categories/${category.id}`}
                        className={[
                          'block text-sm hover:text-accent',
                          task.done ? 'text-muted line-through' : 'text-ink',
                        ].join(' ')}
                      >
                        {task.title}
                      </Link>
                    ) : (
                      <p className={['text-sm text-ink', task.done ? 'text-muted line-through' : ''].join(' ')}>
                        {task.title}
                      </p>
                    )}
                    {category ? (
                      <Link
                        to={`/categories/${category.id}`}
                        className="mt-0.5 inline-block text-[11px] text-accent-dark hover:text-accent"
                      >
                        {category.icon} {category.name}
                        {parentTitle ? ` · ${parentTitle}` : ''}
                      </Link>
                    ) : null}
                  </div>
                </li>
              )
            })
          )}
        </ul>
      ) : null}
    </section>
  )
}
