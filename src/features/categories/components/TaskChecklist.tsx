import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { Link } from 'react-router-dom'
import type { Task } from '../../../core/types/entity'
import {
  DEADLINE_PHASES,
  deadlinePhaseLabel,
  deadlinePhaseOf,
  type DeadlinePhase,
} from '../../../core/config/deadlines'
import { groupTasks } from '../../../core/utils/taskTree'
import { DragGrip } from '../../../core/ui/DragGrip'
import { OverflowMenu, OverflowMenuItem } from '../../../core/ui/OverflowMenu'
import { ProgressBar } from '../../../core/ui/ProgressBar'

interface TaskChecklistProps {
  tasks: Task[]
  categoryName?: string
  onToggle: (taskId: string) => void
  onRemove: (taskId: string) => void
  onRename: (taskId: string, title: string) => void
  onReorder: (orderedIds: string[]) => void
  onDeadline: (taskId: string, phase: DeadlinePhase) => void
  onAddSubtask: (parentId: string, title: string) => Promise<void>
}

function arrayMove<T>(items: T[], from: number, to: number): T[] {
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function TaskChecklist({
  tasks,
  categoryName,
  onToggle,
  onRemove,
  onRename,
  onReorder,
  onDeadline,
  onAddSubtask,
}: TaskChecklistProps) {
  const { roots, childrenByParent } = useMemo(() => groupTasks(tasks), [tasks])
  const [order, setOrder] = useState(() => roots.map((task) => task.id))
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({})
  const [addingParentId, setAddingParentId] = useState<string | null>(null)
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const [submittingSubtask, setSubmittingSubtask] = useState(false)
  const editInputRef = useRef<HTMLInputElement>(null)
  const subtaskInputRef = useRef<HTMLInputElement>(null)

  const itemRefs = useRef(new Map<string, HTMLLIElement>())
  const prevRects = useRef(new Map<string, number>())
  const orderRef = useRef(order)
  const dragRef = useRef<{
    id: string
    grabOffsetY: number
    translateY: number
    lastClientY: number
  } | null>(null)

  orderRef.current = order
  const rootIds = roots.map((task) => task.id).join('|')

  useEffect(() => {
    if (draggingId) return
    setOrder(roots.map((task) => task.id))
  }, [rootIds, draggingId, roots])

  const byId = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])
  const orderedRoots = order
    .map((id) => byId.get(id))
    .filter((task): task is Task => {
      if (!task) return false
      return roots.some((root) => root.id === task.id)
    })

  useLayoutEffect(() => {
    for (const [id, el] of itemRefs.current) {
      const prevTop = prevRects.current.get(id)
      if (prevTop === undefined) continue
      const nextTop = el.getBoundingClientRect().top
      const drag = dragRef.current
      if (drag && id === drag.id) {
        drag.translateY += prevTop - nextTop
        el.style.transition = 'none'
        el.style.transform = `translateY(${drag.translateY}px)`
        continue
      }
      const dy = prevTop - nextTop
      if (Math.abs(dy) < 1) continue
      el.style.transition = 'none'
      el.style.transform = `translateY(${dy}px)`
      el.getBoundingClientRect()
      el.style.transition = 'transform 180ms ease'
      el.style.transform = ''
    }
    prevRects.current.clear()
  }, [order])

  function captureTops() {
    prevRects.current.clear()
    for (const [id, el] of itemRefs.current) {
      prevRects.current.set(id, el.getBoundingClientRect().top)
    }
  }

  function targetIndexForY(clientY: number, excludeId: string) {
    const ids = orderRef.current.filter((id) => id !== excludeId)
    for (let i = 0; i < ids.length; i++) {
      const el = itemRefs.current.get(ids[i])
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (clientY < rect.top + rect.height / 2) return i
    }
    return ids.length
  }

  function applyDragTransform() {
    const drag = dragRef.current
    if (!drag) return
    const el = itemRefs.current.get(drag.id)
    if (!el) return
    el.style.transition = 'none'
    el.style.transform = `translateY(${drag.translateY}px)`
  }

  function handlePointerMove(event: PointerEvent) {
    const drag = dragRef.current
    if (!drag) return
    drag.lastClientY = event.clientY
    const el = itemRefs.current.get(drag.id)
    if (!el) return

    const layoutTop = el.getBoundingClientRect().top - drag.translateY
    drag.translateY = event.clientY - drag.grabOffsetY - layoutTop
    applyDragTransform()

    const from = orderRef.current.indexOf(drag.id)
    const to = targetIndexForY(event.clientY, drag.id)
    if (from < 0 || from === to) return

    captureTops()
    setOrder(arrayMove(orderRef.current, from, to))
  }

  function endDrag() {
    const drag = dragRef.current
    if (!drag) return
    dragRef.current = null
    const el = itemRefs.current.get(drag.id)
    if (el) {
      el.style.transition = 'transform 160ms ease, box-shadow 160ms ease'
      el.style.transform = ''
      el.style.zIndex = ''
      el.style.boxShadow = ''
    }
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', endDrag)
    window.removeEventListener('pointercancel', endDrag)
    setDraggingId(null)
    onReorder(orderRef.current)
  }

  function startEdit(task: Task) {
    setEditingId(task.id)
    setDraftTitle(task.title)
    requestAnimationFrame(() => editInputRef.current?.focus())
  }

  function cancelEdit() {
    setEditingId(null)
    setDraftTitle('')
  }

  function saveEdit(taskId: string) {
    const trimmed = draftTitle.trim()
    if (!trimmed) {
      cancelEdit()
      return
    }
    onRename(taskId, trimmed)
    cancelEdit()
  }

  function handleEditKeyDown(event: KeyboardEvent<HTMLInputElement>, taskId: string) {
    if (event.key === 'Enter') {
      event.preventDefault()
      saveEdit(taskId)
    }
    if (event.key === 'Escape') cancelEdit()
  }

  function startDrag(event: ReactPointerEvent<HTMLButtonElement>, taskId: string) {
    if (event.button !== 0 || editingId) return
    const el = itemRefs.current.get(taskId)
    if (!el) return

    const rect = el.getBoundingClientRect()
    dragRef.current = {
      id: taskId,
      grabOffsetY: event.clientY - rect.top,
      translateY: 0,
      lastClientY: event.clientY,
    }
    el.style.transition = 'none'
    el.style.zIndex = '20'
    el.style.boxShadow = '0 10px 24px rgb(0 0 0 / 0.12)'
    setDraggingId(taskId)
    event.currentTarget.setPointerCapture(event.pointerId)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
  }

  function isOpen(taskId: string) {
    return Boolean(openIds[taskId] || addingParentId === taskId)
  }

  function openSubtaskForm(parentId: string) {
    setOpenIds((current) => ({ ...current, [parentId]: true }))
    setAddingParentId(parentId)
    setSubtaskTitle('')
    requestAnimationFrame(() => subtaskInputRef.current?.focus())
  }

  async function submitSubtask() {
    if (!addingParentId || submittingSubtask || !subtaskTitle.trim()) return
    setSubmittingSubtask(true)
    try {
      await onAddSubtask(addingParentId, subtaskTitle.trim())
      setSubtaskTitle('')
      requestAnimationFrame(() => subtaskInputRef.current?.focus())
    } finally {
      setSubmittingSubtask(false)
    }
  }

  if (tasks.length === 0) {
    return <p className="text-sm text-muted">Пока нет задач — нажмите +.</p>
  }

  return (
    <ul className="space-y-2">
      {orderedRoots.map((task) => {
        const children = childrenByParent.get(task.id) ?? []
        const expanded = isOpen(task.id)
        return (
          <li
            key={task.id}
            ref={(node) => {
              if (node) itemRefs.current.set(task.id, node)
              else itemRefs.current.delete(task.id)
            }}
            className={[
              'rounded-xl border border-cream-dark bg-white',
              draggingId === task.id ? 'relative cursor-grabbing' : '',
            ].join(' ')}
          >
            <TaskRow
              task={task}
              categoryName={categoryName}
              dragging={draggingId === task.id}
              editing={editingId === task.id}
              draftTitle={draftTitle}
              editInputRef={editInputRef}
              onDraftTitle={setDraftTitle}
              onEditKeyDown={(event) => handleEditKeyDown(event, task.id)}
              onSaveEdit={() => saveEdit(task.id)}
              onStartEdit={() => startEdit(task)}
              onStartDrag={(event) => startDrag(event, task.id)}
              onToggle={() => onToggle(task.id)}
              onDeadline={(phase) => onDeadline(task.id, phase)}
              onRemove={() => onRemove(task.id)}
              subtasks={
                children.length > 0
                  ? {
                      done: children.filter((child) => child.done).length,
                      total: children.length,
                      expanded,
                      onToggle: () => {
                        const next = !expanded
                        setOpenIds((current) => ({ ...current, [task.id]: next }))
                        if (!next && addingParentId === task.id) {
                          setAddingParentId(null)
                          setSubtaskTitle('')
                        }
                      },
                    }
                  : undefined
              }
              trailing={
                <button
                  type="button"
                  aria-label="Добавить подзадачу"
                  onClick={() => openSubtaskForm(task.id)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-lg leading-none text-muted hover:bg-cream hover:text-ink"
                >
                  +
                </button>
              }
            />
            {expanded ? (
              <ul className="space-y-1.5 border-t border-cream-dark/70 px-3 py-2">
                {children.map((child) => (
                  <li key={child.id}>
                    <TaskRow
                      task={child}
                      categoryName={categoryName}
                      nested
                      dragging={false}
                      editing={editingId === child.id}
                      draftTitle={draftTitle}
                      editInputRef={editInputRef}
                      onDraftTitle={setDraftTitle}
                      onEditKeyDown={(event) => handleEditKeyDown(event, child.id)}
                      onSaveEdit={() => saveEdit(child.id)}
                      onStartEdit={() => startEdit(child)}
                      onToggle={() => onToggle(child.id)}
                      onDeadline={(phase) => onDeadline(child.id, phase)}
                      onRemove={() => onRemove(child.id)}
                    />
                  </li>
                ))}
                {addingParentId === task.id ? (
                  <li className="flex items-center gap-2 pl-8">
                    <input
                      ref={subtaskInputRef}
                      type="text"
                      value={subtaskTitle}
                      onChange={(event) => setSubtaskTitle(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          void submitSubtask()
                        }
                        if (event.key === 'Escape') {
                          setAddingParentId(null)
                          setSubtaskTitle('')
                        }
                      }}
                      placeholder="Подзадача"
                      disabled={submittingSubtask}
                      className="min-w-0 flex-1 rounded-lg border border-cream-dark px-2 py-1.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                    <button
                      type="button"
                      disabled={submittingSubtask || !subtaskTitle.trim()}
                      onClick={() => void submitSubtask()}
                      className="rounded-lg bg-accent px-2 py-1 text-xs font-medium text-white disabled:opacity-40"
                    >
                      Добавить
                    </button>
                  </li>
                ) : null}
              </ul>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

function TaskRow({
  task,
  categoryName,
  nested,
  dragging,
  editing,
  draftTitle,
  editInputRef,
  onDraftTitle,
  onEditKeyDown,
  onSaveEdit,
  onStartEdit,
  onStartDrag,
  onToggle,
  onDeadline,
  onRemove,
  subtasks,
  trailing,
}: {
  task: Task
  categoryName?: string
  nested?: boolean
  dragging: boolean
  editing: boolean
  draftTitle: string
  editInputRef: RefObject<HTMLInputElement | null>
  onDraftTitle: (value: string) => void
  onEditKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onSaveEdit: () => void
  onStartEdit: () => void
  onStartDrag?: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onToggle: () => void
  onDeadline: (phase: DeadlinePhase) => void
  onRemove: () => void
  subtasks?: {
    done: number
    total: number
    expanded: boolean
    onToggle: () => void
  }
  trailing?: ReactNode
}) {
  const currentPhase = deadlinePhaseOf(task, categoryName)
  return (
    <div className={['flex items-center gap-1 px-2 py-2', nested ? 'pl-2' : 'px-3 py-3', dragging ? 'cursor-grabbing' : ''].join(' ')}>
      {onStartDrag ? (
        <button
          type="button"
          aria-label="Перетащить"
          onPointerDown={onStartDrag}
          className="flex w-5 shrink-0 cursor-grab touch-none items-center justify-center self-stretch rounded-lg text-muted hover:bg-cream active:cursor-grabbing"
        >
          <DragGrip />
        </button>
      ) : (
        <span className="w-5 shrink-0" />
      )}
      <input
        type="checkbox"
        checked={task.done}
        onChange={onToggle}
        className="size-5 shrink-0 rounded border-cream-dark text-accent focus:ring-accent/30"
      />
      {editing ? (
        <input
          ref={editInputRef}
          type="text"
          value={draftTitle}
          onChange={(event) => onDraftTitle(event.target.value)}
          onKeyDown={onEditKeyDown}
          onBlur={onSaveEdit}
          className="min-w-0 flex-1 rounded-lg border border-cream-dark px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      ) : (
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onStartEdit}
            className={[
              'block w-full truncate text-left text-sm',
              task.done ? 'text-muted line-through' : 'text-ink',
            ].join(' ')}
          >
            {task.title}
          </button>
          {nested ? null : (
            <div className="mt-0.5 flex items-center gap-2">
              {currentPhase ? (
                <Link
                  to="/deadlines"
                  className="shrink-0 text-[11px] text-accent-dark hover:text-accent"
                >
                  {deadlinePhaseLabel(currentPhase)}
                </Link>
              ) : (
                <p className="shrink-0 text-[11px] text-muted">Срок не задан</p>
              )}
              {subtasks ? (
                <button
                  type="button"
                  aria-label={subtasks.expanded ? 'Скрыть подзадачи' : 'Показать подзадачи'}
                  aria-expanded={subtasks.expanded}
                  onClick={subtasks.onToggle}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-muted hover:text-ink"
                >
                  <ProgressBar
                    value={subtasks.total === 0 ? 0 : Math.round((subtasks.done / subtasks.total) * 100)}
                    className="h-1 min-w-0 flex-1"
                  />
                  <span className="shrink-0 text-[11px] tabular-nums">
                    {subtasks.done}/{subtasks.total}
                  </span>
                  <span
                    aria-hidden
                    className={[
                      'inline-flex size-8 shrink-0 items-center justify-center text-lg leading-none transition-transform duration-200',
                      subtasks.expanded ? '' : '-rotate-90',
                    ].join(' ')}
                  >
                    ▾
                  </span>
                </button>
              ) : null}
            </div>
          )}
        </div>
      )}
      {trailing}
      <OverflowMenu
        ariaLabel="Действия"
        widthClass="w-48"
        triggerClassName={
          nested
            ? 'rounded-md px-1 py-0 text-base leading-none text-muted hover:bg-cream disabled:opacity-40'
            : undefined
        }
      >
        {(close) => (
          <>
            <OverflowMenuItem
              onClick={() => {
                close()
                onStartEdit()
              }}
            >
              Изменить
            </OverflowMenuItem>
            {DEADLINE_PHASES.map((phase) => (
              <OverflowMenuItem
                key={phase.id}
                onClick={() => {
                  close()
                  onDeadline(phase.id)
                }}
              >
                {currentPhase === phase.id ? '✓ ' : ''}
                {phase.label}
              </OverflowMenuItem>
            ))}
            <OverflowMenuItem
              danger
              onClick={() => {
                close()
                onRemove()
              }}
            >
              Удалить
            </OverflowMenuItem>
          </>
        )}
      </OverflowMenu>
    </div>
  )
}
