import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { Category } from '../../../core/types/entity'
import { CategoryCard } from './CategoryCard'

function arrayMove<T>(items: T[], from: number, to: number): T[] {
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

interface CategoryListProps {
  categories: Category[]
  statsByCategory: Map<string, { done: number; total: number }>
  onReorder: (orderedIds: string[]) => void
  onUpdate: (categoryId: string, input: { name: string; icon: string }) => void
  onRemove: (categoryId: string) => void
}

export function CategoryList({
  categories,
  statsByCategory,
  onReorder,
  onUpdate,
  onRemove,
}: CategoryListProps) {
  const [order, setOrder] = useState(() => categories.map((category) => category.id))
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [draftIcon, setDraftIcon] = useState('')
  const itemRefs = useRef(new Map<string, HTMLLIElement>())
  const prevRects = useRef(new Map<string, number>())
  const orderRef = useRef(order)
  const dragRef = useRef<{
    id: string
    grabOffsetY: number
    translateY: number
  } | null>(null)

  orderRef.current = order

  useEffect(() => {
    if (draggingId) return
    setOrder(categories.map((category) => category.id))
  }, [categories, draggingId])

  const byId = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories])
  const ordered = order.map((id) => byId.get(id)).filter((category): category is Category => Boolean(category))

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

  function handlePointerMove(event: PointerEvent) {
    const drag = dragRef.current
    if (!drag) return
    const el = itemRefs.current.get(drag.id)
    if (!el) return

    const layoutTop = el.getBoundingClientRect().top - drag.translateY
    drag.translateY = event.clientY - drag.grabOffsetY - layoutTop
    el.style.transition = 'none'
    el.style.transform = `translateY(${drag.translateY}px)`

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

  function startEdit(category: Category) {
    setEditingId(category.id)
    setDraftName(category.name)
    setDraftIcon(category.icon)
  }

  function cancelEdit() {
    setEditingId(null)
    setDraftName('')
    setDraftIcon('')
  }

  function saveEdit(categoryId: string) {
    const name = draftName.trim()
    if (!name) {
      cancelEdit()
      return
    }
    onUpdate(categoryId, { name, icon: draftIcon.trim() || '📋' })
    cancelEdit()
  }

  function startDrag(event: ReactPointerEvent<HTMLButtonElement>, categoryId: string) {
    if (event.button !== 0 || editingId) return
    const el = itemRefs.current.get(categoryId)
    if (!el) return

    const rect = el.getBoundingClientRect()
    dragRef.current = {
      id: categoryId,
      grabOffsetY: event.clientY - rect.top,
      translateY: 0,
    }
    el.style.transition = 'none'
    el.style.zIndex = '20'
    el.style.boxShadow = '0 10px 24px rgb(0 0 0 / 0.12)'
    setDraggingId(categoryId)
    event.currentTarget.setPointerCapture(event.pointerId)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
  }

  return (
    <ul className="space-y-2">
      {ordered.map((category) => {
        const stats = statsByCategory.get(category.id) ?? { done: 0, total: 0 }
        return (
          <li
            key={category.id}
            ref={(node) => {
              if (node) itemRefs.current.set(category.id, node)
              else itemRefs.current.delete(category.id)
            }}
            className={draggingId === category.id ? 'relative' : ''}
          >
            <CategoryCard
              category={category}
              done={stats.done}
              total={stats.total}
              editing={editingId === category.id}
              draftName={draftName}
              draftIcon={draftIcon}
              onDraftName={setDraftName}
              onDraftIcon={setDraftIcon}
              onSaveEdit={() => saveEdit(category.id)}
              onCancelEdit={cancelEdit}
              onStartEdit={() => startEdit(category)}
              onRemove={() => onRemove(category.id)}
              onDragPointerDown={(event) => startDrag(event, category.id)}
            />
          </li>
        )
      })}
    </ul>
  )
}
