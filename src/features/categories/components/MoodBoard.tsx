import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { MoodItem } from '../../../core/types/entity'
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
}

export function MoodBoard({ projectId, categoryId }: MoodBoardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [preview, setPreview] = useState<MoodItem | null>(null)

  const items = useLiveQuery(async () => {
    return moodRepository.listByCategory(projectId, categoryId)
  }, [projectId, categoryId])

  function closeMenu() {
    setMenuOpen(false)
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

      <div className="relative z-30 flex justify-end">
        <div className="relative flex flex-col items-end">
          <AddButton
            aria-label={menuOpen ? 'Закрыть' : 'Добавить'}
            aria-expanded={menuOpen}
            disabled={submitting}
            rotated={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          />
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
        </div>
      </div>

      {error && !linkOpen ? <p className="text-sm text-red-600">{error}</p> : null}
      {submitting ? <p className="text-sm text-muted">Сохранение…</p> : null}

      {list.length === 0 ? (
        <EmptyState
          title="Мудборд пока пуст"
          description="Нажмите + и добавьте фото из галереи или ссылку."
        />
      ) : (
        <MoodGrid
          items={list}
          onOpen={(item) => setPreview(item)}
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

      {preview ? <MoodPreview item={preview} onClose={() => setPreview(null)} /> : null}
    </div>
  )
}

function moveToIndex(ids: string[], id: string, to: number): string[] {
  const next = ids.filter((itemId) => itemId !== id)
  next.splice(Math.max(0, Math.min(to, next.length)), 0, id)
  return next
}

function MoodGrid({
  items,
  onOpen,
  onRemove,
  onReorder,
}: {
  items: MoodItem[]
  onOpen: (item: MoodItem) => void
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
          dragging={draggingId === item.id}
          onPointerDown={(event) => handlePointerDown(event, item.id)}
          onRef={(node) => {
            if (node) itemRefs.current.set(item.id, node)
            else itemRefs.current.delete(item.id)
          }}
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

function MoodCard({
  item,
  dragging,
  onPointerDown,
  onRef,
  onRemove,
}: {
  item: MoodItem
  dragging: boolean
  onPointerDown: (event: ReactPointerEvent<HTMLLIElement>) => void
  onRef: (node: HTMLLIElement | null) => void
  onRemove: () => void
}) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (item.kind !== 'image') return
    let cancelled = false
    signedMoodUrl(item.storagePath).then((url) => {
      if (!cancelled) setSrc(url)
    })
    return () => {
      cancelled = true
    }
  }, [item.kind, item.storagePath])

  const mediaRadius = item.caption ? 'rounded-t-xl' : 'rounded-xl'

  return (
    <li
      ref={onRef}
      onPointerDown={onPointerDown}
      className={[
        'relative touch-none rounded-xl bg-white shadow-sm',
        dragging ? 'cursor-grabbing' : 'cursor-grab',
      ].join(' ')}
    >
      <div className={`block w-full overflow-hidden text-left ${mediaRadius}`}>
        {item.kind === 'image' ? (
          src ? (
            <img
              src={src}
              alt={item.caption || item.fileName}
              draggable={false}
              className="pointer-events-none w-full object-cover"
            />
          ) : (
            <div className="flex h-36 items-center justify-center bg-cream text-xs text-muted">Фото</div>
          )
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
      {item.caption ? (
        <p className="truncate px-3 py-2 text-xs text-ink">{item.caption}</p>
      ) : null}
    </li>
  )
}

function MoodPreview({ item, onClose }: { item: MoodItem; onClose: () => void }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (item.kind !== 'image') return
    signedMoodUrl(item.storagePath).then(setSrc)
  }, [item])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4" onClick={onClose}>
      <div
        className="max-h-full w-full max-w-lg overflow-auto rounded-2xl bg-white p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {item.kind === 'image' && src ? (
          <img src={src} alt={item.caption || item.fileName} className="w-full rounded-xl object-contain" />
        ) : null}
        {item.kind === 'link' ? (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="break-all text-sm font-medium text-accent-dark hover:text-accent"
          >
            {item.url}
          </a>
        ) : null}
        {item.caption ? <p className="mt-3 text-sm text-ink">{item.caption}</p> : null}
        <Button variant="secondary" className="mt-4" onClick={onClose}>
          Закрыть
        </Button>
      </div>
    </div>
  )
}
