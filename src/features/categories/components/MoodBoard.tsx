import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { MoodCanvasLayout, MoodItem } from '../../../core/types/entity'
import { resizeFromCorner, type ResizeHandle } from '../../../core/config/moodCanvas'
import {
  CLOTHES_BOARD_COPY,
  formatMoneyInput,
  formatVenueBudget,
  formatVenuePeople,
  VENUE_BOARD_COPY,
  venueCardFields,
  type PlaceBoardCopy,
} from '../../../core/config/moodboard'
import { AddButton } from '../../../core/ui/AddButton'
import { Button } from '../../../core/ui/Button'
import { EmptyState } from '../../../core/ui/EmptyState'
import { Input } from '../../../core/ui/Input'
import { OverflowMenu, OverflowMenuItem } from '../../../core/ui/OverflowMenu'
import { moodRepository } from '../../../data/repositories/moodRepository'
import { signedMoodUrl } from '../../../data/supabase/storage'

interface MoodBoardProps {
  projectId: string
  categoryId: string
  variant?: 'media' | 'venue' | 'clothes'
}

export function MoodBoard({ projectId, categoryId, variant = 'media' }: MoodBoardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [placeOpen, setPlaceOpen] = useState(false)
  const [editingPlace, setEditingPlace] = useState<MoodItem | null>(null)
  const [placeFile, setPlaceFile] = useState<File | null>(null)
  const [placeName, setPlaceName] = useState('')
  const [placeBudget, setPlaceBudget] = useState('')
  const [placeDetails, setPlaceDetails] = useState('')
  const [placeComment, setPlaceComment] = useState('')
  const [url, setUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [layoutEditing, setLayoutEditing] = useState(false)
  const copy = variant === 'clothes' ? CLOTHES_BOARD_COPY : VENUE_BOARD_COPY
  const venue = variant === 'venue' || variant === 'clothes'

  const items = useLiveQuery(async () => {
    return moodRepository.listByCategory(projectId, categoryId)
  }, [projectId, categoryId])

  function closeMenu() {
    setMenuOpen(false)
  }

  function openPlaceSheet(item?: MoodItem) {
    closeMenu()
    setPreviewId(null)
    setError(null)
    setPlaceFile(null)
    if (item) {
      const fields = venueCardFields(item)
      setEditingPlace(item)
      setPlaceName(fields.place)
      setPlaceBudget(formatMoneyInput(fields.budget))
      setPlaceDetails(fields.details)
      setPlaceComment(fields.comment)
      setUrl(fields.url)
    } else {
      setEditingPlace(null)
      setPlaceName('')
      setPlaceBudget('')
      setPlaceDetails('')
      setPlaceComment('')
      setUrl('')
    }
    setPlaceOpen(true)
  }

  function openPhotoPicker() {
    closeMenu()
    requestAnimationFrame(() => fileInputRef.current?.click())
  }

  function openLinkSheet() {
    closeMenu()
    setError(null)
    setUrl('')
    setCaption('')
    setLinkOpen(true)
  }

  async function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setError(null)
    setSubmitting(true)
    try {
      await moodRepository.addImage(projectId, categoryId, file, '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить фото')
    } finally {
      setSubmitting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSavePlace() {
    if (!placeName.trim()) {
      setError(copy.nameRequired)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const fields = {
        place: placeName,
        budget: formatMoneyInput(placeBudget),
        details: copy.showDetails ? placeDetails : '',
        comment: placeComment,
        url,
      }
      if (editingPlace) {
        await moodRepository.updateVenue(projectId, editingPlace.id, placeFile, fields)
      } else {
        const created = await moodRepository.addVenue(projectId, categoryId, placeFile, fields)
        if (variant === 'clothes') {
          const col = list.length % 2
          const row = Math.floor(list.length / 2)
          await moodRepository.updateCanvas(projectId, created.id, {
            ...created.canvas,
            width: 180,
            height: 280,
            x: 16 + col * 196,
            y: 16 + row * 296,
            z: list.length,
          })
        }
      }
      setPlaceOpen(false)
      setEditingPlace(null)
      setPlaceFile(null)
      setPreviewId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.saveError)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddLink() {
    setError(null)
    setSubmitting(true)
    try {
      await moodRepository.addLink(projectId, categoryId, url, caption)
      setLinkOpen(false)
      setUrl('')
      setCaption('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить ссылку')
    } finally {
      setSubmitting(false)
    }
  }

  const list = items ?? []
  const preview = list.find((item) => item.id === previewId) ?? null

  return (
    <div className="relative space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-20"
          aria-label="Закрыть меню"
          onClick={closeMenu}
        />
      ) : null}

      <div className="relative z-30 flex justify-end gap-2">
        {variant === 'clothes' && list.length > 0 ? (
          <Button
            variant={layoutEditing ? 'primary' : 'secondary'}
            aria-label={layoutEditing ? 'Готово' : 'Редактировать мудборд'}
            aria-pressed={layoutEditing}
            className="shrink-0 px-4"
            onClick={() => setLayoutEditing((open) => !open)}
          >
            <span className="flex h-5 w-5 items-center justify-center" aria-hidden>
              <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12.4 4.4 15.6 7.6M3.5 16.5l3.1-.6 8.4-8.4a1.8 1.8 0 0 0 0-2.5l-.9-.9a1.8 1.8 0 0 0-2.5 0L3.2 12.5l-.7 4z"
                />
              </svg>
            </span>
          </Button>
        ) : null}
        <div className="relative flex flex-col items-end">
          <AddButton
            aria-label={venue ? copy.addAria : menuOpen ? 'Закрыть' : 'Добавить'}
            aria-expanded={venue ? placeOpen : menuOpen}
            disabled={submitting}
            rotated={!venue && menuOpen}
            onClick={() => (venue ? openPlaceSheet() : setMenuOpen((open) => !open))}
          />
          {venue ? null : (
          <div
            className={[
              'absolute right-0 top-full z-40 mt-2 flex flex-col items-end gap-2 transition-all duration-300',
              menuOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0',
            ].join(' ')}
          >
            <MoodAction
              label="Добавить фото"
              delay="delay-75"
              open={menuOpen}
              onClick={openPhotoPicker}
            />
            <MoodAction
              label="Добавить ссылку"
              delay="delay-150"
              open={menuOpen}
              onClick={openLinkSheet}
            />
          </div>
          )}
        </div>
      </div>

      {error && !linkOpen ? <p className="text-sm text-red-600">{error}</p> : null}
      {submitting ? <p className="text-sm text-muted">Сохранение…</p> : null}

      {list.length === 0 ? (
        <EmptyState
          title={venue ? copy.emptyTitle : 'Мудборд пока пуст'}
          description={
            venue
              ? copy.emptyDescription
              : 'Нажмите + и добавьте фото из галереи или ссылку.'
          }
        />
      ) : variant === 'clothes' ? (
        <PlaceCanvas
          projectId={projectId}
          items={list}
          copy={copy}
          editing={layoutEditing}
          onOpen={(item) => setPreviewId(item.id)}
          onChoose={(itemId) => {
            moodRepository.chooseVenue(projectId, categoryId, itemId).catch(console.error)
          }}
          onRemove={(itemId) => {
            moodRepository.remove(projectId, itemId).catch(console.error)
          }}
        />
      ) : (
        <MoodGrid
          items={list}
          venue={venue}
          copy={copy}
          onOpen={(item) => setPreviewId(item.id)}
          onChoose={(itemId) => {
            moodRepository.chooseVenue(projectId, categoryId, itemId).catch(console.error)
          }}
          onRemove={(itemId) => {
            moodRepository.remove(projectId, itemId).catch(console.error)
          }}
          onReorder={(orderedIds) => {
            moodRepository.reorder(projectId, categoryId, orderedIds).catch(console.error)
          }}
        />
      )}

      {linkOpen ? (
        <LinkSheet
          url={url}
          caption={caption}
          error={error}
          submitting={submitting}
          onUrl={setUrl}
          onCaption={setCaption}
          onClose={() => {
            setLinkOpen(false)
            setError(null)
          }}
          onSave={() => void handleAddLink()}
        />
      ) : null}

      {placeOpen ? (
        <PlaceSheet
          copy={copy}
          editing={Boolean(editingPlace)}
          placeName={placeName}
          budget={placeBudget}
          details={placeDetails}
          comment={placeComment}
          url={url}
          file={placeFile}
          existingPhoto={Boolean(editingPlace?.storagePath)}
          error={error}
          submitting={submitting}
          onPlaceName={setPlaceName}
          onBudget={setPlaceBudget}
          onDetails={setPlaceDetails}
          onComment={setPlaceComment}
          onUrl={setUrl}
          onFile={setPlaceFile}
          onClose={() => {
            setPlaceOpen(false)
            setError(null)
          }}
          onSave={() => void handleSavePlace()}
        />
      ) : null}

      {preview ? (
        <MoodPreview
          item={preview}
          venue={venue}
          copy={copy}
          onClose={() => setPreviewId(null)}
          onEdit={() => openPlaceSheet(preview)}
          onChoose={() => {
            moodRepository.chooseVenue(projectId, categoryId, preview.id).catch(console.error)
          }}
        />
      ) : null}
    </div>
  )
}

function moveToIndex(ids: string[], id: string, to: number): string[] {
  const next = ids.filter((itemId) => itemId !== id)
  next.splice(Math.max(0, Math.min(to, next.length)), 0, id)
  return next
}

const PLACE_MIN_SIZE = 132
const PLACE_HANDLES: { id: ResizeHandle; className: string }[] = [
  { id: 'nw', className: 'left-0 top-0 cursor-nwse-resize' },
  { id: 'ne', className: 'right-0 top-0 cursor-nesw-resize' },
  { id: 'sw', className: 'bottom-0 left-0 cursor-nesw-resize' },
  { id: 'se', className: 'bottom-0 right-0 cursor-nwse-resize' },
  { id: 'n', className: 'left-1/2 top-0 -translate-x-1/2 cursor-ns-resize' },
  { id: 's', className: 'bottom-0 left-1/2 -translate-x-1/2 cursor-ns-resize' },
  { id: 'w', className: 'left-0 top-1/2 -translate-y-1/2 cursor-ew-resize' },
  { id: 'e', className: 'right-0 top-1/2 -translate-y-1/2 cursor-ew-resize' },
]

function PlaceCanvas({
  projectId,
  items,
  copy,
  editing,
  onOpen,
  onChoose,
  onRemove,
}: {
  projectId: string
  items: MoodItem[]
  copy: PlaceBoardCopy
  editing: boolean
  onOpen: (item: MoodItem) => void
  onChoose?: (itemId: string) => void
  onRemove: (itemId: string) => void
}) {
  const [drafts, setDrafts] = useState<Record<string, MoodCanvasLayout>>({})
  const draftsRef = useRef(drafts)
  draftsRef.current = drafts
  const itemsRef = useRef(items)
  itemsRef.current = items
  const [activeId, setActiveId] = useState<string | null>(null)
  const spreadDoneRef = useRef(false)
  const gestureRef = useRef<{
    id: string
    mode: 'move' | 'resize'
    handle?: ResizeHandle
    startX: number
    startY: number
    origin: MoodCanvasLayout
    moved: boolean
    pointerId: number
    target: HTMLElement
  } | null>(null)

  useEffect(() => {
    if (spreadDoneRef.current || items.length < 2) {
      spreadDoneRef.current = true
      return
    }
    const clustered = items.every((item, index) => {
      if (index === 0) return true
      const first = items[0].canvas
      return Math.hypot(item.canvas.x - first.x, item.canvas.y - first.y) < 90
    })
    if (!clustered) {
      spreadDoneRef.current = true
      return
    }
    spreadDoneRef.current = true
    items.forEach((item, index) => {
      const width = Math.max(item.canvas.width, 180)
      const height = Math.max(item.canvas.height, 260)
      const col = index % 2
      const row = Math.floor(index / 2)
      moodRepository
        .updateCanvas(projectId, item.id, {
          ...item.canvas,
          width,
          height,
          x: 16 + col * (width + 16),
          y: 16 + row * (height + 16),
          z: index,
        })
        .catch(console.error)
    })
  }, [items, projectId])

  function layoutOf(item: MoodItem) {
    return drafts[item.id] ?? item.canvas
  }

  const bounds = items.reduce(
    (acc, item) => {
      const layout = layoutOf(item)
      return {
        width: Math.max(acc.width, layout.x + layout.width + 48),
        height: Math.max(acc.height, layout.y + layout.height + 48),
      }
    },
    { width: 560, height: 480 },
  )

  function handlePointerMove(event: PointerEvent) {
    const gesture = gestureRef.current
    if (!gesture) return
    const dx = event.clientX - gesture.startX
    const dy = event.clientY - gesture.startY
    if (!editing && gesture.mode === 'move') return
    if (!gesture.moved && Math.hypot(dx, dy) < 8) return
    gesture.moved = true
    event.preventDefault()
    const next =
      gesture.mode === 'resize' && gesture.handle
        ? resizeFromCorner(gesture.origin, gesture.handle, dx, dy, PLACE_MIN_SIZE)
        : {
            ...gesture.origin,
            x: Math.max(0, gesture.origin.x + dx),
            y: Math.max(0, gesture.origin.y + dy),
          }
    setDrafts((current) => ({ ...current, [gesture.id]: next }))
  }

  function endPointer(event: PointerEvent) {
    const gesture = gestureRef.current
    gestureRef.current = null
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', endPointer)
    window.removeEventListener('pointercancel', endPointer)
    if (!gesture) return
    try {
      gesture.target.releasePointerCapture(gesture.pointerId)
    } catch {
      /* already released */
    }
    setActiveId(null)
    if (!gesture.moved) {
      if (editing) return
      const item = itemsRef.current.find((entry) => entry.id === gesture.id)
      if (item && event.type === 'pointerup') onOpen(item)
      return
    }
    const layout = draftsRef.current[gesture.id]
    if (!layout) return
    const z =
      itemsRef.current.reduce((max, item) => Math.max(max, (draftsRef.current[item.id] ?? item.canvas).z), 0) + 1
    const saved = { ...layout, z }
    setDrafts((current) => ({ ...current, [gesture.id]: saved }))
    moodRepository.updateCanvas(projectId, gesture.id, saved).catch(console.error)
  }

  function handlePointerDown(
    event: ReactPointerEvent<HTMLElement>,
    item: MoodItem,
    handle?: ResizeHandle,
  ) {
    if (event.button !== 0) return
    const target = event.target
    if (target instanceof Element && target.closest('[data-no-drag]') && !handle) return

    const origin = layoutOf(item)
    gestureRef.current = {
      id: item.id,
      mode: handle ? 'resize' : 'move',
      handle,
      startX: event.clientX,
      startY: event.clientY,
      origin,
      moved: false,
      pointerId: event.pointerId,
      target: event.currentTarget,
    }
    setActiveId(item.id)
    event.currentTarget.setPointerCapture(event.pointerId)
    window.addEventListener('pointermove', handlePointerMove, { passive: false })
    window.addEventListener('pointerup', endPointer)
    window.addEventListener('pointercancel', endPointer)
  }

  return (
    <div className="max-h-[70vh] overflow-auto rounded-2xl border border-cream-dark bg-cream/40">
      <div className="relative" style={{ width: bounds.width, height: bounds.height, minHeight: '28rem' }}>
        {items.map((item) => {
          const layout = layoutOf(item)
          return (
            <div
              key={item.id}
              className="absolute"
              style={{
                left: layout.x,
                top: layout.y,
                width: layout.width,
                height: layout.height,
                zIndex: item.id === activeId ? 40 : layout.z,
              }}
            >
              <MoodCard
                item={item}
                venue
                copy={copy}
                fill
                dragging={activeId === item.id}
                onPointerDown={(event) => handlePointerDown(event, item)}
                onChoose={onChoose ? () => onChoose(item.id) : undefined}
                onRemove={() => onRemove(item.id)}
              />
              {editing
                ? PLACE_HANDLES.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      aria-label="Изменить размер"
                      data-resize={entry.id}
                      onPointerDown={(event) => {
                        event.stopPropagation()
                        handlePointerDown(event, item, entry.id)
                      }}
                      className={[
                        'absolute z-30 h-3 w-3 rounded-full border border-white bg-accent shadow-sm',
                        entry.className,
                      ].join(' ')}
                    />
                  ))
                : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MoodGrid({
  items,
  venue,
  copy,
  onOpen,
  onChoose,
  onRemove,
  onReorder,
}: {
  items: MoodItem[]
  venue?: boolean
  copy: PlaceBoardCopy
  onOpen: (item: MoodItem) => void
  onChoose?: (itemId: string) => void
  onRemove: (itemId: string) => void
  onReorder: (orderedIds: string[]) => void
}) {
  const [order, setOrder] = useState(() => items.map((item) => item.id))
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const itemRefs = useRef(new Map<string, HTMLLIElement>())
  const prevRects = useRef(new Map<string, DOMRect>())
  const orderRef = useRef(order)
  const dragRef = useRef<{
    id: string
    grabOffsetX: number
    grabOffsetY: number
    translateX: number
    translateY: number
    moved: boolean
  } | null>(null)
  const pendingRef = useRef<{
    id: string
    pointerId: number
    startX: number
    startY: number
    target: HTMLElement
  } | null>(null)

  orderRef.current = order

  useEffect(() => {
    if (draggingId) return
    setOrder(items.map((item) => item.id))
  }, [items, draggingId])

  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items])
  const orderedItems = order.map((id) => byId.get(id)).filter((item): item is MoodItem => Boolean(item))

  useLayoutEffect(() => {
    for (const [id, el] of itemRefs.current) {
      const prev = prevRects.current.get(id)
      if (!prev) continue
      const next = el.getBoundingClientRect()
      const drag = dragRef.current
      if (drag && id === drag.id) {
        drag.translateX += prev.left - next.left
        drag.translateY += prev.top - next.top
        el.style.transition = 'none'
        el.style.transform = `translate(${drag.translateX}px, ${drag.translateY}px)`
        continue
      }
      const dx = prev.left - next.left
      const dy = prev.top - next.top
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
      el.style.transition = 'none'
      el.style.transform = `translate(${dx}px, ${dy}px)`
      el.getBoundingClientRect()
      el.style.transition = 'transform 180ms ease'
      el.style.transform = ''
    }
    prevRects.current.clear()
  }, [order])

  function captureRects() {
    prevRects.current.clear()
    for (const [id, el] of itemRefs.current) {
      prevRects.current.set(id, el.getBoundingClientRect())
    }
  }

  function targetIndexForPoint(clientX: number, clientY: number, excludeId: string) {
    const ids = orderRef.current.filter((id) => id !== excludeId)
    for (let i = 0; i < ids.length; i++) {
      const el = itemRefs.current.get(ids[i])
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        return clientX > rect.left + rect.width / 2 ? i + 1 : i
      }
    }

    let best = ids.length
    let bestDistance = Number.POSITIVE_INFINITY
    for (let i = 0; i < ids.length; i++) {
      const el = itemRefs.current.get(ids[i])
      if (!el) continue
      const rect = el.getBoundingClientRect()
      const dx = clientX - (rect.left + rect.width / 2)
      const dy = clientY - (rect.top + rect.height / 2)
      const distance = dx * dx + dy * dy
      if (distance < bestDistance) {
        bestDistance = distance
        best = i
      }
    }
    return best
  }

  function applyDragTransform() {
    const drag = dragRef.current
    if (!drag) return
    const el = itemRefs.current.get(drag.id)
    if (!el) return
    el.style.transition = 'none'
    el.style.transform = `translate(${drag.translateX}px, ${drag.translateY}px)`
  }

  function handlePointerMove(event: PointerEvent) {
    const pending = pendingRef.current
    if (pending && !dragRef.current) {
      const distance = Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY)
      if (distance < 8) return
      const el = itemRefs.current.get(pending.id)
      if (!el) return
      const rect = el.getBoundingClientRect()
      dragRef.current = {
        id: pending.id,
        grabOffsetX: event.clientX - rect.left,
        grabOffsetY: event.clientY - rect.top,
        translateX: 0,
        translateY: 0,
        moved: true,
      }
      el.style.transition = 'none'
      el.style.zIndex = '30'
      el.style.boxShadow = '0 12px 28px rgb(0 0 0 / 0.16)'
      pending.target.setPointerCapture(pending.pointerId)
      setDraggingId(pending.id)
    }

    const drag = dragRef.current
    if (!drag) return
    event.preventDefault()
    const el = itemRefs.current.get(drag.id)
    if (!el) return

    const layoutLeft = el.getBoundingClientRect().left - drag.translateX
    const layoutTop = el.getBoundingClientRect().top - drag.translateY
    drag.translateX = event.clientX - drag.grabOffsetX - layoutLeft
    drag.translateY = event.clientY - drag.grabOffsetY - layoutTop
    applyDragTransform()

    const to = targetIndexForPoint(event.clientX, event.clientY, drag.id)
    const next = moveToIndex(orderRef.current, drag.id, to)
    if (next.join() === orderRef.current.join()) return

    captureRects()
    setOrder(next)
  }

  function clearDragStyles(id: string) {
    const el = itemRefs.current.get(id)
    if (!el) return
    el.style.transition = 'transform 160ms ease, box-shadow 160ms ease'
    el.style.transform = ''
    el.style.zIndex = ''
    el.style.boxShadow = ''
  }

  function endDrag(event: PointerEvent) {
    const pending = pendingRef.current
    const drag = dragRef.current
    pendingRef.current = null
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', endDrag)
    window.removeEventListener('pointercancel', endDrag)

    if (!drag) {
      if (pending && event.type === 'pointerup') {
        const item = byId.get(pending.id)
        if (item) onOpen(item)
      }
      return
    }

    dragRef.current = null
    clearDragStyles(drag.id)
    setDraggingId(null)
    onReorder(orderRef.current)
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLLIElement>, itemId: string) {
    if (event.button !== 0) return
    const target = event.target
    if (target instanceof Element && target.closest('[data-no-drag]')) return

    pendingRef.current = {
      id: itemId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      target: event.currentTarget,
    }
    window.addEventListener('pointermove', handlePointerMove, { passive: false })
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {orderedItems.map((item) => (
        <MoodCard
          key={item.id}
          item={item}
          venue={venue}
          copy={copy}
          dragging={draggingId === item.id}
          onPointerDown={(event) => handlePointerDown(event, item.id)}
          onRef={(node) => {
            if (node) itemRefs.current.set(item.id, node)
            else itemRefs.current.delete(item.id)
          }}
          onChoose={onChoose ? () => onChoose(item.id) : undefined}
          onRemove={() => onRemove(item.id)}
        />
      ))}
    </ul>
  )
}

function MoodAction({
  label,
  open,
  delay,
  onClick,
}: {
  label: string
  open: boolean
  delay: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-ink shadow-md transition-all duration-300',
        delay,
        open ? 'scale-100 opacity-100' : 'scale-75 opacity-0',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

function LinkSheet({
  url,
  caption,
  error,
  submitting,
  onUrl,
  onCaption,
  onClose,
  onSave,
}: {
  url: string
  caption: string
  error: string | null
  submitting: boolean
  onUrl: (value: string) => void
  onCaption: (value: string) => void
  onClose: () => void
  onSave: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold text-ink">Добавить ссылку</h3>
        <div className="space-y-3">
          <Input
            label="Ссылка"
            name="moodUrl"
            type="url"
            placeholder="https://…"
            autoFocus
            value={url}
            onChange={(e) => onUrl(e.target.value)}
          />
          <Input
            label="Подпись"
            name="moodCaption"
            placeholder="Необязательно"
            value={caption}
            onChange={(e) => onCaption(e.target.value)}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={onClose}>
              Отмена
            </Button>
            <Button fullWidth disabled={submitting || !url.trim()} onClick={onSave}>
              {submitting ? 'Сохранение…' : 'Добавить'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PhotoSpinner({ className }: { className?: string }) {
  return (
    <div
      className={['flex items-center justify-center bg-cream', className].filter(Boolean).join(' ')}
      aria-busy="true"
      aria-label="Загрузка фото"
    >
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-cream-dark border-t-accent" />
    </div>
  )
}

function MoodPhoto({
  storagePath,
  alt,
  imgClassName,
  spinnerClassName,
  className = '',
}: {
  storagePath: string
  alt: string
  imgClassName: string
  spinnerClassName: string
  className?: string
}) {
  const [src, setSrc] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setSrc(null)
    setReady(false)
    setFailed(false)
    signedMoodUrl(storagePath).then((url) => {
      if (cancelled) return
      if (!url) setFailed(true)
      else setSrc(url)
    })
    return () => {
      cancelled = true
    }
  }, [storagePath])

  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-cream text-xs text-muted ${spinnerClassName}`}>
        Нет фото
      </div>
    )
  }

  return (
    <div className={`relative bg-cream ${className} ${ready ? '' : spinnerClassName}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          draggable={false}
          onLoad={() => setReady(true)}
          onError={() => setFailed(true)}
          className={`${imgClassName} ${ready ? 'relative opacity-100' : 'absolute inset-0 h-full w-full opacity-0'}`}
        />
      ) : null}
      {ready ? null : <PhotoSpinner className={`absolute inset-0 ${spinnerClassName}`} />}
    </div>
  )
}

function formatPlaceDetails(copy: PlaceBoardCopy, value: string) {
  if (copy.detailsSuffix === 'чел') return formatVenuePeople(value)
  return value.trim()
}

function MoodCard({
  item,
  venue,
  copy,
  fill,
  dragging,
  onPointerDown,
  onRef,
  onChoose,
  onRemove,
}: {
  item: MoodItem
  venue?: boolean
  copy: PlaceBoardCopy
  fill?: boolean
  dragging: boolean
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
  onRef?: (node: HTMLLIElement | null) => void
  onChoose?: () => void
  onRemove: () => void
}) {
  const fields = venueCardFields(item)
  const showFooter = venue || Boolean(item.caption)
  const mediaRadius = showFooter ? 'rounded-t-xl' : 'rounded-xl'

  return (
    <li
      ref={onRef}
      onPointerDown={onPointerDown}
      className={[
        'relative touch-none rounded-xl bg-white shadow-sm',
        fill ? 'flex h-full flex-col overflow-hidden' : '',
        dragging ? 'cursor-grabbing' : 'cursor-grab',
        venue && fields.chosen ? 'ring-2 ring-accent' : '',
      ].join(' ')}
    >
      <div
        className={[
          'block w-full overflow-hidden text-left',
          mediaRadius,
          fill ? 'min-h-0 flex-1' : '',
        ].join(' ')}
      >
        {item.storagePath ? (
          <MoodPhoto
            storagePath={item.storagePath}
            alt={item.caption || item.fileName}
            className={fill ? 'h-full' : ''}
            imgClassName={`pointer-events-none w-full object-cover ${fill ? 'h-full' : ''}`}
            spinnerClassName={fill ? 'h-full min-h-24' : 'h-36'}
          />
        ) : venue ? (
          <div
            className={`flex items-center justify-center bg-cream text-xs text-muted ${fill ? 'h-full min-h-24' : 'h-36'}`}
          >
            Нет фото
          </div>
        ) : (
          <div className="flex min-h-28 flex-col items-center justify-center gap-1 bg-cream px-3 py-6 text-center">
            <span className="text-2xl">🔗</span>
            <span className="line-clamp-3 break-all text-xs text-muted">{item.url}</span>
          </div>
        )}
      </div>
      <div data-no-drag className="absolute right-1 top-1 z-20 rounded-full bg-white/85 shadow-sm">
        <OverflowMenu
          ariaLabel="Действия"
          widthClass="w-36"
          triggerClassName="rounded-full px-1.5 py-0.5 text-base leading-none text-ink hover:bg-cream/80 disabled:opacity-40"
        >
          {(close) => (
            <OverflowMenuItem
              danger
              onClick={() => {
                close()
                onRemove()
              }}
            >
              Удалить
            </OverflowMenuItem>
          )}
        </OverflowMenu>
      </div>
      {venue ? (
        <div className="shrink-0 space-y-0.5 px-2.5 py-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="min-w-0 truncate text-xs font-medium text-ink">
              {fields.place || copy.cardNameFallback}
            </p>
            <p className="shrink-0 text-xs text-muted">
              {formatVenueBudget(fields.budget) || 'Стоимость'}
            </p>
          </div>
          {copy.showDetails ? (
            <p className="text-xs text-muted">
              {formatPlaceDetails(copy, fields.details) || copy.detailsFallback || copy.detailsLabel}
            </p>
          ) : null}
          {fields.comment ? (
            <p className="line-clamp-2 text-xs text-muted">{fields.comment}</p>
          ) : null}
          {onChoose ? (
            <button
              type="button"
              data-no-drag
              onClick={(event) => {
                event.stopPropagation()
                onChoose()
              }}
              className={[
                'mt-1.5 w-full rounded-full px-2 py-1 text-[11px] font-medium',
                fields.chosen
                  ? 'bg-accent text-white'
                  : 'border border-cream-dark bg-white text-accent-dark',
              ].join(' ')}
            >
              {fields.chosen ? 'Выбрано' : 'Берём'}
            </button>
          ) : null}
        </div>
      ) : item.caption ? (
        <p className="truncate px-3 py-2 text-xs text-ink">{item.caption}</p>
      ) : null}
    </li>
  )
}

function MoodPreview({
  item,
  venue,
  copy,
  onClose,
  onEdit,
  onChoose,
}: {
  item: MoodItem
  venue?: boolean
  copy: PlaceBoardCopy
  onClose: () => void
  onEdit?: () => void
  onChoose?: () => void
}) {
  const fields = venueCardFields(item)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4" onClick={onClose}>
      <div
        className="max-h-full w-full max-w-lg overflow-auto rounded-2xl bg-white p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {item.storagePath ? (
          <MoodPhoto
            storagePath={item.storagePath}
            alt={fields.place || item.fileName}
            imgClassName="w-full rounded-xl object-contain"
            spinnerClassName="h-52 rounded-xl"
          />
        ) : item.kind === 'link' && !venue ? (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="break-all text-sm font-medium text-accent-dark hover:text-accent"
          >
            {item.url}
          </a>
        ) : (
          <div className="flex h-40 items-center justify-center rounded-xl bg-cream text-sm text-muted">Нет фото</div>
        )}
        {venue ? (
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 truncate font-medium text-ink">{fields.place || copy.cardNameFallback}</p>
              <p className="shrink-0 text-muted">
                {formatVenueBudget(fields.budget) || 'Стоимость не указана'}
              </p>
            </div>
            {copy.showDetails && fields.details ? (
              <p className="text-muted">{formatPlaceDetails(copy, fields.details)}</p>
            ) : null}
            {fields.comment ? <p className="whitespace-pre-wrap text-muted">{fields.comment}</p> : null}
            {fields.url ? (
              <a
                href={fields.url}
                target="_blank"
                rel="noreferrer"
                className="inline-block pt-1 font-medium text-accent-dark hover:text-accent"
              >
                Открыть ссылку
              </a>
            ) : null}
          </div>
        ) : item.caption ? (
          <p className="mt-3 text-sm text-ink">{item.caption}</p>
        ) : null}
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex gap-2">
            {venue && onChoose ? (
              <Button
                fullWidth
                variant={fields.chosen ? 'primary' : 'secondary'}
                onPointerDown={(event) => {
                  event.stopPropagation()
                  event.preventDefault()
                  onChoose()
                }}
              >
                {fields.chosen ? 'Выбрано' : 'Берём'}
              </Button>
            ) : null}
            {venue && onEdit ? (
              <Button
                fullWidth
                variant="secondary"
                onPointerDown={(event) => {
                  event.stopPropagation()
                  event.preventDefault()
                  onEdit()
                }}
              >
                Изменить
              </Button>
            ) : null}
          </div>
          <Button variant="secondary" fullWidth={venue} className={venue ? '' : 'mt-0'} onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  )
}

function PlaceSheet({
  copy,
  editing,
  placeName,
  budget,
  details,
  comment,
  url,
  file,
  existingPhoto,
  error,
  submitting,
  onPlaceName,
  onBudget,
  onDetails,
  onComment,
  onUrl,
  onFile,
  onClose,
  onSave,
}: {
  copy: PlaceBoardCopy
  editing: boolean
  placeName: string
  budget: string
  details: string
  comment: string
  url: string
  file: File | null
  existingPhoto: boolean
  error: string | null
  submitting: boolean
  onPlaceName: (value: string) => void
  onBudget: (value: string) => void
  onDetails: (value: string) => void
  onComment: (value: string) => void
  onUrl: (value: string) => void
  onFile: (file: File | null) => void
  onClose: () => void
  onSave: () => void
}) {
  const photoRef = useRef<HTMLInputElement>(null)
  const preview = file ? URL.createObjectURL(file) : null

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 p-4 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-semibold text-ink">
          {editing ? copy.sheetTitleEdit : copy.sheetTitleNew}
        </h3>
        <div className="space-y-3">
          <input
            ref={photoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(event) => onFile(event.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            className="flex w-full items-center justify-center rounded-xl border border-dashed border-cream-dark bg-cream/50 px-3 py-4 text-sm text-accent-dark"
          >
            {file ? file.name : existingPhoto ? 'Заменить фото' : 'Добавить фото'}
          </button>
          {preview ? (
            <img src={preview} alt="" className="max-h-40 w-full rounded-xl object-cover" />
          ) : null}
          <Input
            label={copy.nameLabel}
            name="venuePlace"
            placeholder={copy.namePlaceholder}
            autoFocus
            value={placeName}
            onChange={(e) => onPlaceName(e.target.value)}
          />
          <Input
            label="Стоимость"
            name="venueBudget"
            inputMode="numeric"
            placeholder="400 000"
            suffix="₽"
            value={budget}
            onChange={(e) => {
              const input = e.target
              const digitsBefore = input.value.slice(0, input.selectionStart ?? 0).replace(/\D/g, '').length
              const next = formatMoneyInput(input.value)
              onBudget(next)
              requestAnimationFrame(() => {
                let seen = 0
                let pos = next.length
                for (let i = 0; i < next.length; i++) {
                  if (/\d/.test(next[i])) {
                    seen += 1
                    if (seen >= digitsBefore) {
                      pos = i + 1
                      break
                    }
                  }
                }
                if (digitsBefore === 0) pos = 0
                input.setSelectionRange(pos, pos)
              })
            }}
          />
          {copy.showDetails ? (
            <Input
              label={copy.detailsLabel}
              name="venueDetails"
              inputMode={copy.detailsSuffix === 'чел' ? 'numeric' : 'text'}
              placeholder={copy.detailsPlaceholder}
              suffix={copy.detailsSuffix}
              value={details}
              onChange={(e) => onDetails(e.target.value)}
            />
          ) : null}
          <label htmlFor="venueComment" className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Комментарий</span>
            <textarea
              id="venueComment"
              name="venueComment"
              rows={3}
              placeholder={copy.commentPlaceholder}
              value={comment}
              onChange={(e) => onComment(e.target.value)}
              className="w-full resize-y rounded-xl border border-cream-dark bg-white px-3 py-2.5 text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </label>
          <Input
            label="Ссылка"
            name="venueUrl"
            type="url"
            placeholder="https://…"
            value={url}
            onChange={(e) => onUrl(e.target.value)}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={onClose}>
              Отмена
            </Button>
            <Button fullWidth disabled={submitting || !placeName.trim()} onClick={onSave}>
              {submitting ? 'Сохранение…' : editing ? 'Сохранить' : 'Добавить'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
