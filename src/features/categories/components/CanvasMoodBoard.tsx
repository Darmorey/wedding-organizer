import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  defaultTextStyle,
  imageDrawRect,
  minFrameSize,
  panImageInsideFrame,
  resetImageCrop,
  resizeFromCorner,
  type ResizeHandle,
} from '../../../core/config/moodCanvas'
import type { MoodCanvasLayout, MoodItem, MoodTextStyle } from '../../../core/types/entity'
import { Button } from '../../../core/ui/Button'
import { Input } from '../../../core/ui/Input'
import { OverflowMenu, OverflowMenuItem } from '../../../core/ui/OverflowMenu'
import { moodRepository } from '../../../data/repositories/moodRepository'
import { signedMoodUrl } from '../../../data/supabase/storage'

interface CanvasMoodBoardProps {
  projectId: string
  categoryId: string
}

const MIN_ZOOM = 0.4
const MAX_ZOOM = 2.4

export function CanvasMoodBoard({ projectId, categoryId }: CanvasMoodBoardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const panZoomRef = useRef({ x: 28, y: 36, zoom: 1 })
  const gestureRef = useRef<
    | { type: 'pan'; lastX: number; lastY: number }
    | {
        type: 'item'
        id: string
        mode: 'move' | 'resize' | 'rotate' | 'crop'
        corner?: ResizeHandle
        lastX: number
        lastY: number
        alreadySelected: boolean
        selectionHandled: boolean
      }
    | null
  >(null)
  const movedRef = useRef(false)

  const [pan, setPan] = useState({ x: 28, y: 36 })
  const [zoom, setZoom] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectedIdsRef = useRef<string[]>([])
  selectedIdsRef.current = selectedIds
  const multiSelectModeRef = useRef(false)
  const longPressTimerRef = useRef<number | null>(null)
  const longPressFiredRef = useRef(false)
  const listRef = useRef<MoodItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [cropMode, setCropMode] = useState(false)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const [drafts, setDrafts] = useState<Record<string, MoodCanvasLayout>>({})
  const draftsRef = useRef(drafts)
  draftsRef.current = drafts
  const [attachOpen, setAttachOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const items = useLiveQuery(async () => {
    return moodRepository.listByCategory(projectId, categoryId)
  }, [projectId, categoryId])

  const list = items ?? []
  listRef.current = list
  const primaryId = selectedIds[selectedIds.length - 1] ?? null
  const selected = list.find((item) => item.id === primaryId) ?? null
  const multiSelected = selectedIds.length > 1

  function clearLongPressTimer() {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  function clearSelection() {
    setSelectedIds([])
    multiSelectModeRef.current = false
    setEditingId(null)
    setCropMode(false)
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
      multiSelectModeRef.current = next.length > 1
      return next
    })
  }

  useEffect(() => {
    const node = viewportRef.current
    if (!node) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const factor = event.deltaY > 0 ? 0.94 : 1.06
      const ids = selectedIdsRef.current
      const selected =
        ids.length === 1 ? listRef.current.find((entry) => entry.id === ids[0]) : undefined
      if (selected?.kind === 'image') {
        const current = draftsRef.current[selected.id] ?? selected.canvas
        const imageZoom = Math.min(5, Math.max(1, (current.imageZoom || 1) * (event.deltaY > 0 ? 0.92 : 1.08)))
        const next = { ...current, imageZoom }
        draftsRef.current = { ...draftsRef.current, [selected.id]: next }
        setDrafts(draftsRef.current)
        persistCanvas(selected.id, next)
        return
      }
      applyZoomAt(panZoomRef.current.zoom * factor, event.clientX, event.clientY)
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') clearSelection()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      node.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  function commitPanZoom() {
    setPan({ x: panZoomRef.current.x, y: panZoomRef.current.y })
    setZoom(panZoomRef.current.zoom)
  }

  function layoutOf(item: MoodItem): MoodCanvasLayout {
    return drafts[item.id] ?? item.canvas
  }

  function applyZoomAt(nextZoom: number, clientX: number, clientY: number) {
    const viewport = viewportRef.current
    if (!viewport) return
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom))
    const rect = viewport.getBoundingClientRect()
    const mx = clientX - rect.left
    const my = clientY - rect.top
    const current = panZoomRef.current
    const scale = clamped / current.zoom
    panZoomRef.current = {
      x: mx - (mx - current.x) * scale,
      y: my - (my - current.y) * scale,
      zoom: clamped,
    }
    commitPanZoom()
  }

  function boardDelta(clientDX: number, clientDY: number) {
    const z = panZoomRef.current.zoom
    return { x: clientDX / z, y: clientDY / z }
  }

  function persistCanvas(itemId: string, canvas: MoodCanvasLayout) {
    moodRepository.updateCanvas(projectId, itemId, canvas).catch(console.error)
  }

  function bringToFront(item: MoodItem) {
    const maxZ = list.reduce((max, entry) => Math.max(max, layoutOf(entry).z), 0)
    const current = layoutOf(item)
    if (current.z >= maxZ) return current
    const next = { ...current, z: maxZ + 1 }
    setDrafts((drafts) => ({ ...drafts, [item.id]: next }))
    persistCanvas(item.id, next)
    return next
  }

  function onViewportPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    if (event.target !== event.currentTarget && !(event.target as HTMLElement).dataset?.board) return
    if (cropMode && primaryId) {
      const canvas = draftsRef.current[primaryId]
      if (canvas) persistCanvas(primaryId, canvas)
    }
    clearSelection()
    setAttachOpen(false)
    movedRef.current = false
    gestureRef.current = { type: 'pan', lastX: event.clientX, lastY: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onViewportPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current
    if (!gesture) return
    const dx = event.clientX - gesture.lastX
    const dy = event.clientY - gesture.lastY
    if (Math.hypot(dx, dy) > 2) {
      movedRef.current = true
      clearLongPressTimer()
      if (
        gesture.type === 'item' &&
        !multiSelectModeRef.current &&
        !selectedIdsRef.current.includes(gesture.id)
      ) {
        setSelectedIds([gesture.id])
      }
    }

    if (gesture.type === 'pan') {
      panZoomRef.current = {
        ...panZoomRef.current,
        x: panZoomRef.current.x + dx,
        y: panZoomRef.current.y + dy,
      }
      gesture.lastX = event.clientX
      gesture.lastY = event.clientY
      commitPanZoom()
      return
    }

    const item = list.find((entry) => entry.id === gesture.id)
    if (!item) return
    const current = draftsRef.current[item.id] ?? item.canvas
    let next = current

    if (gesture.mode === 'rotate') {
      const viewport = viewportRef.current
      if (!viewport) return
      const rect = viewport.getBoundingClientRect()
      const centerX = rect.left + panZoomRef.current.x + (current.x + current.width / 2) * panZoomRef.current.zoom
      const centerY = rect.top + panZoomRef.current.y + (current.y + current.height / 2) * panZoomRef.current.zoom
      const angle = (Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180) / Math.PI + 90
      next = { ...current, rotation: snapRotation(angle) }
    } else if (gesture.mode === 'crop') {
      const delta = boardDelta(dx, dy)
      next = panImageInsideFrame(current, delta.x, delta.y)
    } else {
      const delta = boardDelta(dx, dy)
      if (gesture.mode === 'resize') {
        next = resizeFromCorner(current, gesture.corner ?? 'se', delta.x, delta.y, minFrameSize(item.kind))
      } else if (
        gesture.mode === 'move' &&
        selectedIdsRef.current.length > 1 &&
        selectedIdsRef.current.includes(item.id)
      ) {
        const updates: Record<string, MoodCanvasLayout> = { ...draftsRef.current }
        for (const id of selectedIdsRef.current) {
          const entry = list.find((row) => row.id === id)
          if (!entry) continue
          const layout = updates[id] ?? entry.canvas
          updates[id] = { ...layout, x: layout.x + delta.x, y: layout.y + delta.y }
        }
        gesture.lastX = event.clientX
        gesture.lastY = event.clientY
        draftsRef.current = updates
        setDrafts(updates)
        return
      } else {
        next = {
          ...current,
          x: current.x + delta.x,
          y: current.y + delta.y,
        }
      }
    }
    gesture.lastX = event.clientX
    gesture.lastY = event.clientY
    draftsRef.current = { ...draftsRef.current, [item.id]: next }
    setDrafts(draftsRef.current)
  }

  function onViewportPointerUp() {
    clearLongPressTimer()
    const gesture = gestureRef.current
    gestureRef.current = null
    if (gesture?.type !== 'item') return
    const idsToPersist =
      gesture.mode === 'move' && selectedIdsRef.current.includes(gesture.id)
        ? selectedIdsRef.current
        : [gesture.id]
    for (const id of idsToPersist) {
      const canvas = draftsRef.current[id]
      if (canvas) persistCanvas(id, canvas)
    }
    if (movedRef.current || longPressFiredRef.current) return
    const item = list.find((entry) => entry.id === gesture.id)
    if (!item) return
    if (multiSelectModeRef.current && !gesture.selectionHandled) {
      toggleSelected(item.id)
      setEditingId(null)
      return
    }
    if (multiSelectModeRef.current) return
    setSelectedIds([item.id])
    if (item.kind === 'note') setEditingId(item.id)
    if (item.kind === 'link' && gesture.alreadySelected && item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer')
    }
  }

  function startItemGesture(
    event: ReactPointerEvent<HTMLElement>,
    item: MoodItem,
    mode: 'move' | 'resize' | 'rotate' | 'crop',
    corner?: ResizeHandle,
  ) {
    event.stopPropagation()
    if (event.button !== 0) return
    movedRef.current = false
    longPressFiredRef.current = false
    clearLongPressTimer()
    const modifier = event.ctrlKey || event.metaKey || event.shiftKey
    const alreadySelected = selectedIdsRef.current.includes(item.id)
    const isTouch = event.pointerType === 'touch' || event.pointerType === 'pen'
    if (!alreadySelected) setCropMode(false)
    setAttachOpen(false)
    let selectionHandled = false

    if (modifier) {
      toggleSelected(item.id)
      setEditingId(null)
      multiSelectModeRef.current = true
      selectionHandled = true
    } else if (multiSelectModeRef.current) {
      setEditingId(null)
    } else if (alreadySelected && selectedIdsRef.current.length > 1) {
      /* keep group for drag */
    } else if (!(isTouch && mode === 'move')) {
      setSelectedIds([item.id])
      if (item.kind !== 'note') setEditingId(null)
    }

    if ((event.pointerType === 'touch' || event.pointerType === 'pen') && mode === 'move') {
      longPressTimerRef.current = window.setTimeout(() => {
        longPressFiredRef.current = true
        multiSelectModeRef.current = true
        setEditingId(null)
        setCropMode(false)
        setSelectedIds((current) => (current.includes(item.id) ? current : [...current, item.id]))
        try {
          navigator.vibrate?.(12)
        } catch {
          /* ignore */
        }
      }, 480)
    }

    bringToFront(item)
    gestureRef.current = {
      type: 'item',
      id: item.id,
      mode,
      corner,
      lastX: event.clientX,
      lastY: event.clientY,
      alreadySelected,
      selectionHandled,
    }
    viewportRef.current?.setPointerCapture(event.pointerId)
  }

  async function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setError(null)
    setSubmitting(true)
    try {
      const item = await moodRepository.addImage(projectId, categoryId, file, '')
      setSelectedIds([item.id])
      multiSelectModeRef.current = false
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить фото')
    } finally {
      setSubmitting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (cameraInputRef.current) cameraInputRef.current.value = ''
    }
  }

  async function handleReplaceFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file || !primaryId) return
    setError(null)
    setSubmitting(true)
    try {
      await moodRepository.replaceImage(projectId, primaryId, file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось заменить фото')
    } finally {
      setSubmitting(false)
      if (replaceInputRef.current) replaceInputRef.current.value = ''
    }
  }

  async function handleAddLink() {
    setError(null)
    setSubmitting(true)
    try {
      const item = await moodRepository.addLink(projectId, categoryId, url, caption)
    setAttachOpen(false)
    setLinkOpen(false)
    setUrl('')
    setCaption('')
    setSelectedIds([item.id])
    multiSelectModeRef.current = false
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить ссылку')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddNote() {
    setAttachOpen(false)
    setSubmitting(true)
    try {
      const item = await moodRepository.addNote(projectId, categoryId)
      setSelectedIds([item.id])
      multiSelectModeRef.current = false
      setEditingId(item.id)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative -mx-6 overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => void handleReplaceFiles(e.target.files)}
      />

      {error && !linkOpen ? (
        <p className="absolute left-4 top-3 z-30 max-w-[70%] text-sm text-red-600">{error}</p>
      ) : null}

      <div
        ref={viewportRef}
        className="relative h-[calc(100dvh-13.5rem)] min-h-96 touch-none overflow-hidden bg-[#eef1f4]"
        onPointerDown={onViewportPointerDown}
        onPointerMove={onViewportPointerMove}
        onPointerUp={onViewportPointerUp}
        onPointerCancel={onViewportPointerUp}
      >
        <div
          data-board="true"
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: 3600,
            height: 3600,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            backgroundImage: 'radial-gradient(#c5cad1 1.35px, transparent 1.35px)',
            backgroundSize: '22px 22px',
          }}
          onPointerDown={onViewportPointerDown}
        >
          {list.map((item) => (
            <CanvasCard
              key={item.id}
              item={item}
              layout={layoutOf(item)}
              selected={selectedIds.includes(item.id)}
              showHandles={!multiSelected && selectedIds.includes(item.id)}
              editing={editingId === item.id}
              cropMode={cropMode && primaryId === item.id && !multiSelected}
              onMovePointerDown={(event) => startItemGesture(event, item, 'move')}
              onCropPointerDown={(event) => startItemGesture(event, item, 'crop')}
              onRotatePointerDown={(event) => startItemGesture(event, item, 'rotate')}
              onResizePointerDown={(event, handle) => startItemGesture(event, item, 'resize', handle)}
              onSelect={() => {}}
              onCaption={(value) => {
                moodRepository.updateCaption(projectId, item.id, value).catch(console.error)
              }}
              onFrameSize={(width, height) => {
                const current = layoutOf(item)
                if (Math.abs(current.width - width) < 1 && Math.abs(current.height - height) < 1) return
                const next = { ...current, width, height }
                draftsRef.current = { ...draftsRef.current, [item.id]: next }
                setDrafts(draftsRef.current)
                persistCanvas(item.id, next)
              }}
              onNaturalSize={(naturalWidth, naturalHeight) => {
                const current = layoutOf(item)
                if (current.mediaWidth === naturalWidth && current.mediaHeight === naturalHeight) return
                const next = {
                  ...current,
                  mediaWidth: naturalWidth,
                  mediaHeight: naturalHeight,
                  height:
                    !current.mediaWidth && Math.abs(current.height - 210) <= 8
                      ? Math.round(current.width * (naturalHeight / naturalWidth))
                      : current.height,
                }
                draftsRef.current = { ...draftsRef.current, [item.id]: next }
                setDrafts(draftsRef.current)
                persistCanvas(item.id, next)
              }}
            />
          ))}
        </div>

        {list.length === 0 ? (
          <p className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 text-center text-sm text-muted">
            Свободное поле: добавьте фото или запись и расставьте как угодно.
          </p>
        ) : null}

        {selected && !multiSelected && cropMode && selected.kind === 'image' ? (
          <CropZoomBar
            value={layoutOf(selected).imageZoom || 1}
            onChange={(imageZoom) => {
              const current = layoutOf(selected)
              const next = { ...current, imageZoom }
              draftsRef.current = { ...draftsRef.current, [selected.id]: next }
              setDrafts(draftsRef.current)
            }}
            onCommit={() => {
              persistCanvas(selected.id, layoutOf(selected))
              setCropMode(false)
            }}
          />
        ) : multiSelected ? (
          <CanvasItemToolbar
            kind="note"
            cropMode={false}
            extra={<span className="px-2 text-sm text-muted">{selectedIds.length} выбрано</span>}
            onReplace={() => {}}
            onCrop={() => {}}
            onDuplicate={() => {
              const ids = [...selectedIds]
              Promise.all(ids.map((id) => moodRepository.duplicate(projectId, id)))
                .then((copies) => {
                  const nextIds = copies.filter(Boolean).map((copy) => copy!.id)
                  setSelectedIds(nextIds)
                })
                .catch(console.error)
            }}
            onDelete={() => {
              const ids = [...selectedIds]
              clearSelection()
              setDrafts((drafts) => {
                const next = { ...drafts }
                for (const id of ids) delete next[id]
                return next
              })
              Promise.all(ids.map((id) => moodRepository.remove(projectId, id))).catch(console.error)
            }}
            onResetCrop={() => {}}
            onResetRotation={() => {
              const updates = { ...draftsRef.current }
              for (const id of selectedIds) {
                const entry = list.find((row) => row.id === id)
                if (!entry) continue
                const next = { ...(updates[id] ?? entry.canvas), rotation: 0 }
                updates[id] = next
                persistCanvas(id, next)
              }
              draftsRef.current = updates
              setDrafts(updates)
            }}
          />
        ) : selected ? (
          <CanvasItemToolbar
            kind={selected.kind}
            cropMode={cropMode}
            extra={
              selected.kind === 'note' ? (
                <TextFormatTools
                  style={selected.textStyle ?? defaultTextStyle()}
                  onChange={(textStyle) => {
                    moodRepository.updateTextStyle(projectId, selected.id, textStyle).catch(console.error)
                  }}
                />
              ) : null
            }
            onReplace={() => replaceInputRef.current?.click()}
            onCrop={() => setCropMode((value) => !value)}
            onDuplicate={() => {
              moodRepository.duplicate(projectId, selected.id).then((copy) => {
                if (copy) {
                  setSelectedIds([copy.id])
                  multiSelectModeRef.current = false
                }
              }).catch(console.error)
            }}
            onDelete={() => {
              const id = selected.id
              clearSelection()
              setDrafts((drafts) => {
                const next = { ...drafts }
                delete next[id]
                return next
              })
              moodRepository.remove(projectId, id).catch(console.error)
            }}
            onResetCrop={() => {
              const current = layoutOf(selected)
              const next = resetImageCrop(current)
              draftsRef.current = { ...draftsRef.current, [selected.id]: next }
              setDrafts(draftsRef.current)
              persistCanvas(selected.id, next)
            }}
            onResetRotation={() => {
              const current = layoutOf(selected)
              const next = { ...current, rotation: 0 }
              draftsRef.current = { ...draftsRef.current, [selected.id]: next }
              setDrafts(draftsRef.current)
              persistCanvas(selected.id, next)
            }}
          />
        ) : (
          <CanvasCreateBar
            attachOpen={attachOpen}
            onMarker={() => void handleAddNote()}
            onText={() => void handleAddNote()}
            onToggleAttach={() => setAttachOpen((open) => !open)}
            onPhoto={() => {
              setAttachOpen(false)
              requestAnimationFrame(() => fileInputRef.current?.click())
            }}
            onCamera={() => {
              setAttachOpen(false)
              requestAnimationFrame(() => cameraInputRef.current?.click())
            }}
            onLink={() => {
              setAttachOpen(false)
              setError(null)
              setUrl('')
              setCaption('')
              setLinkOpen(true)
            }}
          />
        )}
      </div>

      {linkOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" onClick={() => setLinkOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold text-ink">Добавить ссылку</h3>
            <div className="space-y-3">
              <Input label="Ссылка" name="moodUrl" type="url" placeholder="https://…" autoFocus value={url} onChange={(e) => setUrl(e.target.value)} />
              <Input label="Подпись" name="moodCaption" placeholder="Необязательно" value={caption} onChange={(e) => setCaption(e.target.value)} />
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <div className="flex gap-2">
                <Button variant="secondary" fullWidth onClick={() => setLinkOpen(false)}>
                  Отмена
                </Button>
                <Button fullWidth disabled={submitting || !url.trim()} onClick={() => void handleAddLink()}>
                  {submitting ? 'Сохранение…' : 'Добавить'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function snapRotation(angle: number): number {
  const normalized = ((angle + 180) % 360) - 180
  const snapped = Math.round(normalized / 15) * 15
  return Math.abs(normalized - snapped) <= 4 ? snapped : Math.round(normalized)
}

const CROP_HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

function handleClass(handle: ResizeHandle): string {
  const map: Record<ResizeHandle, string> = {
    nw: '-left-1.5 -top-1.5 cursor-nwse-resize',
    n: 'left-1/2 -top-1.5 -translate-x-1/2 cursor-ns-resize',
    ne: '-right-1.5 -top-1.5 cursor-nesw-resize',
    e: '-right-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize',
    se: '-right-1.5 -bottom-1.5 cursor-nwse-resize',
    s: 'left-1/2 -bottom-1.5 -translate-x-1/2 cursor-ns-resize',
    sw: '-left-1.5 -bottom-1.5 cursor-nesw-resize',
    w: '-left-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize',
  }
  return map[handle]
}

function CropZoomBar({
  value,
  onChange,
  onCommit,
}: {
  value: number
  onChange: (value: number) => void
  onCommit: () => void
}) {
  return (
    <div
      className="absolute inset-x-4 bottom-3 z-30 flex justify-center"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2 shadow-[0_8px_24px_rgb(0_0_0_/_0.12)]">
        <input
          type="range"
          min={1}
          max={5}
          step={0.01}
          value={value}
          aria-label="Масштаб обрезки"
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-1.5 w-40 accent-[#2fd0e0] sm:w-52"
        />
        <button
          type="button"
          aria-label="Готово"
          onClick={onCommit}
          className="flex size-8 items-center justify-center rounded-full bg-[#2fd0e0] text-white shadow-sm"
        >
          ✓
        </button>
      </div>
    </div>
  )
}

const TEXT_COLORS = ['#2a2a2e', '#ffffff', '#e8489a', '#ff8562', '#2fd0e0', '#3b82f6', '#22c55e', '#dff439', '#7c3aed', '#111827']
const BG_COLORS = ['transparent', '#ffffff', '#fff7d6', '#ffe4ef', '#e8f8ff', '#e9fbe8', '#f3e8ff', '#edeff2', '#2a2a2e', '#ff55a7']

function TextFormatTools({
  style,
  onChange,
}: {
  style: MoodTextStyle
  onChange: (style: MoodTextStyle) => void
}) {
  const sizes: MoodTextStyle['size'][] = ['s', 'm', 'l']
  const aligns: MoodTextStyle['align'][] = ['left', 'center', 'right']
  const [picker, setPicker] = useState<'color' | 'background' | null>(null)

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Размер текста"
        className="min-w-7 text-center text-[16px] font-medium text-ink"
        onClick={() => onChange({ ...style, size: sizes[(sizes.indexOf(style.size) + 1) % sizes.length] })}
      >
        Aa
      </button>
      <div className="flex items-end gap-0.5 text-[15px] text-ink">
        <button type="button" aria-label="Жирный" className={style.bold ? 'font-bold' : 'font-semibold opacity-50'} onClick={() => onChange({ ...style, bold: !style.bold })}>
          B
        </button>
        <button type="button" aria-label="Курсив" className={style.italic ? 'italic font-medium' : 'italic opacity-50'} onClick={() => onChange({ ...style, italic: !style.italic })}>
          I
        </button>
        <button type="button" aria-label="Подчёркнутый" className={style.underline ? 'underline font-medium' : 'underline opacity-50'} onClick={() => onChange({ ...style, underline: !style.underline })}>
          U
        </button>
      </div>
      <button
        type="button"
        aria-label="Выравнивание"
        className="text-ink"
        onClick={() => onChange({ ...style, align: aligns[(aligns.indexOf(style.align) + 1) % aligns.length] })}
      >
        <IconAlign />
      </button>
      <button
        type="button"
        aria-label="Список"
        className={style.list ? 'text-accent' : 'text-ink'}
        onClick={() => onChange({ ...style, list: !style.list })}
      >
        <IconList />
      </button>
      <ColorPickerButton
        label="Цвет текста"
        value={style.color}
        colors={TEXT_COLORS}
        open={picker === 'color'}
        onToggle={() => setPicker((current) => (current === 'color' ? null : 'color'))}
        onChange={(color) => onChange({ ...style, color })}
        preview={
          <span className="text-[15px] font-semibold leading-none" style={{ color: style.color }}>
            A
          </span>
        }
      />
      <ColorPickerButton
        label="Цвет фона"
        value={style.background}
        colors={BG_COLORS}
        open={picker === 'background'}
        onToggle={() => setPicker((current) => (current === 'background' ? null : 'background'))}
        onChange={(background) => onChange({ ...style, background })}
        preview={
          <span
            className="size-4 rounded-sm border border-black/15"
            style={swatchStyle(style.background)}
          />
        }
      />
    </div>
  )
}

function swatchStyle(color: string): {
  backgroundColor?: string
  backgroundImage?: string
  backgroundSize?: string
} {
  if (color === 'transparent') {
    return {
      backgroundImage: 'repeating-conic-gradient(#c5cad1 0% 25%, #ffffff 0% 50%)',
      backgroundSize: '8px 8px',
    }
  }
  return { backgroundColor: color }
}

function ColorPickerButton({
  label,
  value,
  colors,
  open,
  preview,
  onToggle,
  onChange,
}: {
  label: string
  value: string
  colors: string[]
  open: boolean
  preview: ReactNode
  onToggle: () => void
  onChange: (value: string) => void
}) {
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        className="flex size-8 items-center justify-center rounded-full hover:bg-cream"
        onClick={onToggle}
      >
        {preview}
      </button>
      {open ? (
        <div className="absolute bottom-full left-1/2 z-40 mb-2 w-[11.5rem] -translate-x-1/2 rounded-2xl bg-white p-2.5 shadow-[0_12px_32px_rgb(0_0_0_/_0.16)]">
          <div className="grid grid-cols-5 gap-1.5">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={color === 'transparent' ? 'Прозрачный' : color}
                className={[
                  'size-7 rounded-full border border-black/10',
                  value.toLowerCase() === color.toLowerCase() ? 'ring-2 ring-accent ring-offset-1' : '',
                ].join(' ')}
                style={swatchStyle(color)}
                onClick={() => onChange(color)}
              />
            ))}
          </div>
          <label className="mt-2 flex items-center gap-2 px-0.5 text-[11px] text-muted">
            Свой
            <input
              type="color"
              value={value === 'transparent' ? '#ffffff' : value}
              aria-label={`${label}, свой цвет`}
              className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
              onChange={(event) => onChange(event.target.value)}
            />
          </label>
        </div>
      ) : null}
    </div>
  )
}

function IconAlign() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 7h14M5 12h10M5 17h12" />
    </svg>
  )
}

function IconList() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M10 7h10M10 12h10M10 17h10" />
      <circle cx="5" cy="7" r="1.2" fill="currentColor" />
      <circle cx="5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="5" cy="17" r="1.2" fill="currentColor" />
    </svg>
  )
}

function noteTextClass(style: MoodTextStyle): string {
  const size = style.size === 's' ? 'text-sm' : style.size === 'l' ? 'text-2xl' : 'text-lg'
  const align = style.align === 'left' ? 'text-left' : style.align === 'right' ? 'text-right' : 'text-center'
  return [
    size,
    align,
    style.bold ? 'font-bold' : 'font-normal',
    style.italic ? 'italic' : '',
    style.underline ? 'underline' : '',
    'w-full max-w-full bg-transparent leading-snug outline-none whitespace-pre-wrap break-words [overflow-wrap:anywhere]',
  ].join(' ')
}

function formatNoteText(text: string, list: boolean): string {
  if (!list) return text
  return text
    .split('\n')
    .map((line) => (line.trim() ? `• ${line.replace(/^•\s*/, '')}` : line))
    .join('\n')
}

function CanvasCreateBar({
  attachOpen,
  onMarker,
  onText,
  onToggleAttach,
  onPhoto,
  onCamera,
  onLink,
}: {
  attachOpen: boolean
  onMarker: () => void
  onText: () => void
  onToggleAttach: () => void
  onPhoto: () => void
  onCamera: () => void
  onLink: () => void
}) {
  return (
    <div
      className="absolute inset-x-4 bottom-3 z-30 flex justify-center"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="relative flex items-center gap-5 rounded-full bg-white px-6 py-2.5 shadow-[0_8px_24px_rgb(0_0_0_/_0.10)]">
        {attachOpen ? (
          <div className="absolute bottom-full left-1/2 mb-3 w-[min(18.5rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-[1.35rem] bg-white py-1 shadow-[0_12px_40px_rgb(0_0_0_/_0.14)]">
            <AttachMenuRow icon={<IconGallery />} label="Выбрать фото или видео" onClick={onPhoto} />
            <AttachMenuRow icon={<IconCamera />} label="Снять фото или видео" onClick={onCamera} />
            <div className="mx-4 my-1 border-t border-black/10" />
            <AttachMenuRow icon={<IconLink />} label="Добавить ссылку" onClick={onLink} />
          </div>
        ) : null}
        <button type="button" aria-label="Маркер" className="flex size-9 items-center justify-center text-ink" onClick={onMarker}>
          <IconMarker />
        </button>
        <button type="button" aria-label="Текст" className="flex size-9 items-center justify-center text-ink" onClick={onText}>
          <IconTextBox />
        </button>
        <button
          type="button"
          aria-label="Вложение"
          aria-expanded={attachOpen}
          className="flex size-9 items-center justify-center text-ink"
          onClick={onToggleAttach}
        >
          <IconClip />
        </button>
      </div>
    </div>
  )
}

function AttachMenuRow({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3.5 px-4 py-3 text-left text-[15px] leading-snug text-ink hover:bg-black/[0.03]"
      onClick={onClick}
    >
      <span className="flex size-7 shrink-0 items-center justify-center">{icon}</span>
      {label}
    </button>
  )
}

function IconMarker() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="9" />
      <path d="M14.2 7.6l2.2 2.2-6.1 6.1H8.1v-2.2l6.1-6.1z" />
    </svg>
  )
}

function IconTextBox() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="M9 10h6M12 10v5" />
    </svg>
  )
}

function IconClip() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M8.5 12.5l6.2-6.2a3 3 0 0 1 4.2 4.2l-7.4 7.4a4.2 4.2 0 0 1-6-6l7.1-7.1" />
    </svg>
  )
}

function IconGallery() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <rect x="7" y="8" width="13" height="11" rx="2" />
      <path d="M4 15V7a2 2 0 0 1 2-2h11" />
      <circle cx="11.2" cy="12.2" r="1.15" fill="currentColor" stroke="none" />
      <path d="M20 16.2l-3.4-3.1-4.4 4.1" />
    </svg>
  )
}

function IconCamera() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M4 8.5h3.1l1.2-2.2h7.4l1.2 2.2H20a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 4 8.5z" />
      <circle cx="12" cy="13.4" r="3.1" />
    </svg>
  )
}

function IconLink() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M10 13.5l4-4" />
      <path d="M8.2 12.2l-1.6 1.6a3.2 3.2 0 0 0 4.5 4.5l2.2-2.2" />
      <path d="M15.8 11.8l1.6-1.6a3.2 3.2 0 0 0-4.5-4.5l-2.2 2.2" />
    </svg>
  )
}

function CanvasItemToolbar({
  kind,
  cropMode,
  extra,
  onReplace,
  onCrop,
  onDuplicate,
  onDelete,
  onResetCrop,
  onResetRotation,
}: {
  kind: MoodItem['kind']
  cropMode: boolean
  extra?: ReactNode
  onReplace: () => void
  onCrop: () => void
  onDuplicate: () => void
  onDelete: () => void
  onResetCrop: () => void
  onResetRotation: () => void
}) {
  return (
    <div
      className="absolute inset-x-4 bottom-3 z-30 flex justify-center"
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.preventDefault()}
    >
      <div className="flex max-w-full flex-wrap items-center justify-center gap-0.5 rounded-full bg-white px-2 py-1.5 shadow-[0_8px_24px_rgb(0_0_0_/_0.12)]">
        {extra}
        {kind === 'image' ? (
          <ToolbarIconButton label="Заменить фото" onClick={onReplace}>
            <IconPhoto />
          </ToolbarIconButton>
        ) : null}
        {kind === 'image' ? (
          <ToolbarIconButton label="Обрезать" active={cropMode} onClick={onCrop}>
            <IconCrop />
          </ToolbarIconButton>
        ) : null}
        {extra || kind === 'image' ? (
          <span className="mx-1 select-none text-sm leading-none text-muted/50">|</span>
        ) : null}
        <ToolbarIconButton label="Дублировать" onClick={onDuplicate}>
          <IconDuplicate />
        </ToolbarIconButton>
        <ToolbarIconButton label="Удалить" danger onClick={onDelete}>
          <IconTrash />
        </ToolbarIconButton>
        <OverflowMenu
          ariaLabel="Ещё"
          widthClass="w-44"
          triggerClassName="flex size-9 items-center justify-center rounded-full text-lg leading-none text-ink hover:bg-cream"
        >
          {(close) => (
            <>
              {kind === 'image' ? (
                <OverflowMenuItem
                  onClick={() => {
                    close()
                    onResetCrop()
                  }}
                >
                  Сбросить обрезку
                </OverflowMenuItem>
              ) : null}
              <OverflowMenuItem
                onClick={() => {
                  close()
                  onResetRotation()
                }}
              >
                Сбросить поворот
              </OverflowMenuItem>
            </>
          )}
        </OverflowMenu>
      </div>
    </div>
  )
}

function ToolbarIconButton({
  label,
  active,
  danger,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  danger?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={[
        'flex size-9 items-center justify-center rounded-full',
        danger ? 'text-red-500 hover:bg-red-50' : active ? 'bg-cream text-ink' : 'text-ink hover:bg-cream',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function IconPhoto() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M21 16l-5-5-7 7" />
    </svg>
  )
}

function IconCrop() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 3v12a3 3 0 0 0 3 3h12" />
      <path d="M18 21V9a3 3 0 0 0-3-3H3" />
    </svg>
  )
}

function IconDuplicate() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M4 16V6a2 2 0 0 1 2-2h10" />
    </svg>
  )
}

function IconRotate() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <path d="M20 12a8 8 0 1 1-2.2-5.5" />
      <path d="M20 4v6h-6" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
    </svg>
  )
}

function CanvasCard({
  item,
  layout,
  selected,
  showHandles,
  cropMode,
  editing,
  onMovePointerDown,
  onCropPointerDown,
  onRotatePointerDown,
  onResizePointerDown,
  onSelect,
  onCaption,
  onFrameSize,
  onNaturalSize,
}: {
  item: MoodItem
  layout: MoodCanvasLayout
  selected: boolean
  showHandles: boolean
  cropMode: boolean
  editing: boolean
  onMovePointerDown: (event: ReactPointerEvent<HTMLElement>) => void
  onCropPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
  onRotatePointerDown: (event: ReactPointerEvent<HTMLElement>) => void
  onResizePointerDown: (event: ReactPointerEvent<HTMLElement>, handle: ResizeHandle) => void
  onSelect: () => void
  onCaption: (value: string) => void
  onFrameSize: (width: number, height: number) => void
  onNaturalSize: (width: number, height: number) => void
}) {
  const [src, setSrc] = useState<string | null>(null)
  const [note, setNote] = useState(item.caption)
  const noteRef = useRef<HTMLTextAreaElement | HTMLParagraphElement | null>(null)
  const noteValueRef = useRef(note)
  noteValueRef.current = note
  const onCaptionRef = useRef(onCaption)
  onCaptionRef.current = onCaption

  const editingRef = useRef(editing)
  editingRef.current = editing

  useEffect(() => {
    if (editingRef.current) return
    setNote(item.caption)
  }, [item.caption])

  useEffect(() => {
    if (!editing) return
    return () => {
      onCaptionRef.current(noteValueRef.current)
    }
  }, [editing])

  useLayoutEffect(() => {
    if (item.kind !== 'note' && item.kind !== 'link') return
    const node = noteRef.current
    if (!node) return
    const previousHeight = node.style.height
    const previousMinHeight = node.style.minHeight
    node.style.height = 'auto'
    node.style.minHeight = '0'
    const nextHeight = Math.max(16, Math.ceil(node.scrollHeight))
    node.style.height = previousHeight
    node.style.minHeight = previousMinHeight
    if (Math.abs(nextHeight - layout.height) > 1) onFrameSize(layout.width, nextHeight)
  }, [item.kind, note, editing, item.caption, item.url, item.textStyle, layout.width, layout.height, onFrameSize])

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

  const draw = item.kind === 'image' ? imageDrawRect(layout) : null
  const textStyle = item.textStyle ?? defaultTextStyle()

  return (
    <article
      className={[
        'absolute origin-center',
        item.kind === 'note'
          ? textStyle.background === 'transparent'
            ? 'shadow-none'
            : 'shadow-md'
          : item.kind === 'link'
            ? 'bg-transparent shadow-none'
            : 'bg-white shadow-md',
        selected && !cropMode ? 'outline outline-2 outline-[#7ec8f0]' : '',
      ].join(' ')}
      style={{
        left: layout.x,
        top: layout.y,
        width: layout.width,
        height: layout.height,
        zIndex: layout.z,
        transform: `rotate(${layout.rotation}deg)`,
        backgroundColor: item.kind === 'note' ? textStyle.background : undefined,
        color: item.kind === 'note' ? textStyle.color : undefined,
      }}
      onPointerDown={cropMode ? onCropPointerDown : onMovePointerDown}
      onPointerUp={onSelect}
    >

      {item.kind === 'image' ? (
        src && draw ? (
          <div className="relative h-full w-full overflow-hidden">
            <img
              src={src}
              alt={item.caption || item.fileName}
              draggable={false}
              className="absolute max-w-none"
              style={{
                width: draw.drawW,
                height: draw.drawH,
                left: draw.left,
                top: draw.top,
              }}
              onLoad={(event) => onNaturalSize(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center bg-cream text-xs text-muted">Фото</div>
        )
      ) : null}

      {item.kind === 'link' ? (
        <p
          ref={(node) => {
            noteRef.current = node
          }}
          className="flex min-h-full items-center px-1 py-0.5 text-sm italic underline decoration-1 underline-offset-2 break-all text-[#2563eb]"
        >
          {item.caption.trim() || item.url.replace(/^https?:\/\//i, '')}
        </p>
      ) : null}

      {item.kind === 'note' ? (
        editing ? (
          <textarea
            ref={(node) => {
              noteRef.current = node
            }}
            autoFocus
            value={note}
            placeholder="Текст"
            onPointerDown={(event) => event.stopPropagation()}
            onChange={(event) => {
              const value = event.target.value
              setNote(value)
              noteValueRef.current = value
            }}
            onBlur={() => onCaptionRef.current(noteValueRef.current)}
            className={`box-border h-full w-full max-w-full resize-none overflow-hidden px-1.5 py-0.5 ${noteTextClass(textStyle)}`}
            style={{ color: textStyle.color }}
          />
        ) : (
          <p
            ref={(node) => {
              noteRef.current = node
            }}
            className={`box-border block max-w-full overflow-hidden px-1.5 py-0.5 ${noteTextClass(textStyle)}`}
            style={{ color: textStyle.color }}
          >
            {formatNoteText(note, textStyle.list) || 'Текст'}
          </p>
        )
      ) : null}

      {cropMode ? (
        <div className="pointer-events-none absolute inset-0 border border-dashed border-ink/80" />
      ) : null}

      {showHandles && !cropMode ? (
        <>
          <span className="pointer-events-none absolute left-1/2 top-0 h-5 w-px -translate-x-1/2 -translate-y-5 bg-[#7ec8f0]" />
          <button
            type="button"
            aria-label="Повернуть"
            className="absolute left-1/2 top-0 z-20 flex size-7 -translate-x-1/2 -translate-y-[2.15rem] items-center justify-center rounded-full bg-white text-ink shadow-[0_2px_8px_rgb(0_0_0_/_0.16)]"
            onPointerDown={onRotatePointerDown}
          >
            <IconRotate />
          </button>
        </>
      ) : null}

      {cropMode
        ? CROP_HANDLES.map((handle) => (
            <button
              key={handle}
              type="button"
              aria-label={`Обрезка ${handle}`}
              className={`absolute z-10 size-3 rounded-full border-2 border-white bg-ink shadow-sm ${handleClass(handle)}`}
              onPointerDown={(event) => onResizePointerDown(event, handle)}
            />
          ))
        : showHandles
          ? (['nw', 'ne', 'sw', 'se'] as ResizeHandle[]).map((handle) => (
              <button
                key={handle}
                type="button"
                aria-label={`Размер ${handle}`}
                className={`absolute z-10 size-2.5 rounded-[2px] border border-white bg-[#6ec4f5] shadow-sm ${handleClass(handle)}`}
                onPointerDown={(event) => onResizePointerDown(event, handle)}
              />
            ))
          : null}
    </article>
  )
}
