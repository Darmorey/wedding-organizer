import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface OverflowMenuProps {
  ariaLabel: string
  disabled?: boolean
  widthClass?: string
  triggerClassName?: string
  placement?: 'bottom' | 'top'
  onClose?: () => void
  children: (close: () => void) => ReactNode
}

export function OverflowMenu({
  ariaLabel,
  disabled,
  widthClass = 'w-52',
  triggerClassName,
  placement = 'bottom',
  onClose,
  children,
}: OverflowMenuProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [coords, setCoords] = useState<CSSProperties>({})

  function close() {
    setOpen(false)
    onClose?.()
  }

  useLayoutEffect(() => {
    if (!open) return
    const trigger = triggerRef.current
    if (!trigger) return

    function update() {
      const rect = trigger.getBoundingClientRect()
      const right = Math.max(8, window.innerWidth - rect.right)
      if (placement === 'top') {
        setCoords({
          right,
          bottom: Math.max(8, window.innerHeight - rect.top + 6),
        })
        return
      }
      setCoords({
        right,
        top: rect.bottom + 6,
      })
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, placement])

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className={
          triggerClassName ??
          'rounded-lg px-2 py-0.5 text-2xl leading-none text-muted hover:bg-cream disabled:opacity-40'
        }
      >
        ⋮
      </button>
      {open
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-[80]"
                aria-label="Закрыть меню"
                onClick={close}
              />
              <div
                role="menu"
                style={coords}
                className={`fixed z-[90] max-w-[calc(100vw-3rem)] rounded-xl border border-cream-dark bg-white py-1 text-sm shadow-md ${widthClass}`}
              >
                {children(close)}
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  )
}

interface OverflowMenuItemProps {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  accent?: boolean
}

export function OverflowMenuItem({
  children,
  onClick,
  disabled,
  danger,
  accent,
}: OverflowMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={[
        'w-full px-3 py-2.5 text-left hover:bg-cream/80 disabled:opacity-50',
        danger ? 'text-red-600' : accent ? 'font-medium text-accent' : 'text-ink',
      ].join(' ')}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
