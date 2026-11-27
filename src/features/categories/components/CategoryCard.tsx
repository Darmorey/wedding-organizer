import { useEffect, useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Category } from '../../../core/types/entity'
import { OverflowMenu, OverflowMenuItem } from '../../../core/ui/OverflowMenu'
import { ProgressBar } from '../../../core/ui/ProgressBar'

interface CategoryCardProps {
  category: Category
  done: number
  total: number
  editing?: boolean
  draftName?: string
  draftIcon?: string
  onDraftName?: (value: string) => void
  onDraftIcon?: (value: string) => void
  onSaveEdit?: () => void
  onCancelEdit?: () => void
  onStartEdit?: () => void
  onRemove?: () => void
  onDragPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void
}

export function CategoryCard({
  category,
  done,
  total,
  editing,
  draftName = '',
  draftIcon = '',
  onDraftName,
  onDraftIcon,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onRemove,
  onDragPointerDown,
}: CategoryCardProps) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) nameRef.current?.focus()
  }, [editing])

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      onSaveEdit?.()
    }
    if (event.key === 'Escape') onCancelEdit?.()
  }

  return (
    <div className="flex items-center rounded-xl border border-cream-dark bg-white hover:bg-cream/50">
      {onDragPointerDown ? (
        <button
          type="button"
          aria-label="Перетащить"
          onPointerDown={onDragPointerDown}
          className="shrink-0 cursor-grab touch-none rounded-l-xl px-1.5 py-3 text-muted hover:bg-cream active:cursor-grabbing"
        >
          <span className="block leading-none">⋮⋮</span>
        </button>
      ) : null}
      {editing ? (
        <div className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-2 pl-1">
          <input
            aria-label="Иконка"
            value={draftIcon}
            onChange={(event) => onDraftIcon?.(event.target.value)}
            onKeyDown={handleKeyDown}
            className="w-12 shrink-0 rounded-lg border border-cream-dark bg-white px-1 py-1.5 text-center text-ink focus:border-accent focus:outline-none"
          />
          <input
            ref={nameRef}
            aria-label="Название"
            value={draftName}
            onChange={(event) => onDraftName?.(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => onSaveEdit?.()}
            className="min-w-0 flex-1 rounded-lg border border-cream-dark bg-white px-2 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
          />
        </div>
      ) : (
        <Link
          to={`/categories/${category.id}`}
          className="flex min-w-0 flex-1 items-center gap-3 py-3 pr-2 pl-2"
        >
          <span className="text-xl leading-none">{category.icon}</span>
          <span className="min-w-0 flex-1 truncate font-medium text-ink">{category.name}</span>
          <div className="w-24 shrink-0 sm:w-28">
            <p className="text-right text-[11px] leading-none text-muted">
              {done} из {total} · {percent}%
            </p>
            <ProgressBar value={percent} className="mt-1.5 h-1.5" />
          </div>
        </Link>
      )}
      {onStartEdit || onRemove ? (
        <div className="shrink-0 pr-1">
          <OverflowMenu
            ariaLabel="Действия"
            widthClass="w-36"
            triggerClassName="rounded-lg px-1.5 py-1 text-xl leading-none text-muted hover:bg-cream disabled:opacity-40"
          >
            {(close) => (
              <>
                {onStartEdit ? (
                  <OverflowMenuItem
                    onClick={() => {
                      close()
                      onStartEdit()
                    }}
                  >
                    Изменить
                  </OverflowMenuItem>
                ) : null}
                {onRemove ? (
                  <OverflowMenuItem
                    danger
                    onClick={() => {
                      close()
                      onRemove()
                    }}
                  >
                    Удалить
                  </OverflowMenuItem>
                ) : null}
              </>
            )}
          </OverflowMenu>
        </div>
      ) : null}
    </div>
  )
}
