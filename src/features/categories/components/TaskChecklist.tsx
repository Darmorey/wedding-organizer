import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { Task } from '../../../core/types/entity'
import { OverflowMenu, OverflowMenuItem } from '../../../core/ui/OverflowMenu'

interface TaskChecklistProps {
  tasks: Task[]
  onToggle: (taskId: string) => void
  onRemove: (taskId: string) => void
  onRename: (taskId: string, title: string) => void
  onReorder: (orderedIds: string[]) => void
}

function arrayMove<T>(items: T[], from: number, to: number): T[] {
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function TaskChecklist({ tasks, onToggle, onRemove, onRename, onReorder }: TaskChecklistProps) {
  const [order, setOrder] = useState(() => tasks.map((task) => task.id))
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    if (draggingId) return
    setOrder(tasks.map((task) => task.id))
  }, [tasks, draggingId])

  const byId = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])
  const orderedTasks = order.map((id) => byId.get(id)).filter((task): task is Task => Boolean(task))

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

  if (tasks.length === 0) {
    return <p className="text-sm text-muted">Пока нет задач — нажмите +.</p>
  }

  return (
    <ul className="space-y-2">
      {orderedTasks.map((task) => (
        <li
          key={task.id}
          ref={(node) => {
            if (node) itemRefs.current.set(task.id, node)
            else itemRefs.current.delete(task.id)
          }}
          className={[
            'flex items-center gap-2 rounded-xl border border-cream-dark bg-white px-3 py-3',
            draggingId === task.id ? 'relative cursor-grabbing' : '',
          ].join(' ')}
        >
          <button
            type="button"
            aria-label="Перетащить"
            onPointerDown={(event) => startDrag(event, task.id)}
            className="shrink-0 cursor-grab touch-none rounded-lg px-1 py-2 text-muted hover:bg-cream active:cursor-grabbing"
          >
            <span className="block leading-none">⋮⋮</span>
          </button>
          <input
            type="checkbox"
            checked={task.done}
            onChange={() => onToggle(task.id)}
            className="size-5 shrink-0 rounded border-cream-dark text-accent focus:ring-accent/30"
          />
          {editingId === task.id ? (
            <input
              ref={editInputRef}
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={(e) => handleEditKeyDown(e, task.id)}
              onBlur={() => saveEdit(task.id)}
              className="min-w-0 flex-1 rounded-lg border border-cream-dark px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          ) : (
            <button
              type="button"
              onClick={() => startEdit(task)}
              className={[
                'min-w-0 flex-1 truncate text-left text-sm',
                task.done ? 'text-muted line-through' : 'text-ink',
              ].join(' ')}
            >
              {task.title}
            </button>
          )}
          <OverflowMenu ariaLabel="Действия" widthClass="w-36">
            {(close) => (
              <>
                <OverflowMenuItem
                  onClick={() => {
                    close()
                    startEdit(task)
                  }}
                >
                  Изменить
                </OverflowMenuItem>
                <OverflowMenuItem
                  danger
                  onClick={() => {
                    close()
                    onRemove(task.id)
                  }}
                >
                  Удалить
                </OverflowMenuItem>
              </>
            )}
          </OverflowMenu>
        </li>
      ))}
    </ul>
  )
}
