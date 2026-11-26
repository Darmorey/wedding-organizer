import { useState, type ReactNode } from 'react'

interface OverflowMenuProps {
  ariaLabel: string
  disabled?: boolean
  widthClass?: string
  triggerClassName?: string
  onClose?: () => void
  children: (close: () => void) => ReactNode
}

export function OverflowMenu({
  ariaLabel,
  disabled,
  widthClass = 'w-52',
  triggerClassName,
  onClose,
  children,
}: OverflowMenuProps) {
  const [open, setOpen] = useState(false)

  function close() {
    setOpen(false)
    onClose?.()
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={
          triggerClassName ??
          'rounded-lg px-2 py-0.5 text-2xl leading-none text-muted hover:bg-cream disabled:opacity-40'
        }
      >
        ⋮
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10"
            aria-label="Закрыть меню"
            onClick={close}
          />
          <div
            role="menu"
            className={`absolute right-0 z-20 mt-1 max-w-[calc(100vw-3rem)] rounded-xl border border-cream-dark bg-white py-1 text-sm shadow-md ${widthClass}`}
          >
            {children(close)}
          </div>
        </>
      ) : null}
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