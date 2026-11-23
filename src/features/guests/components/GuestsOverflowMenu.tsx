import { useState } from 'react'

interface GuestsOverflowMenuProps {
  disabled?: boolean
  onEditCategories: () => void
  onEditStatuses: () => void
}

export function GuestsOverflowMenu({
  disabled,
  onEditCategories,
  onEditStatuses,
}: GuestsOverflowMenuProps) {
  const [open, setOpen] = useState(false)

  function pick(action: () => void) {
    setOpen(false)
    action()
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Меню гостей"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg px-2 py-0.5 text-2xl leading-none text-muted hover:bg-cream disabled:opacity-40"
      >
        ⋮
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10"
            aria-label="Закрыть меню"
            onClick={() => setOpen(false)}
          />
          <ul className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-cream-dark bg-white py-1 text-sm shadow-md">
            <li>
              <button
                type="button"
                className="w-full px-3 py-2.5 text-left text-ink hover:bg-cream/80"
                onClick={() => pick(onEditCategories)}
              >
                Редактировать категории
              </button>
            </li>
            <li>
              <button
                type="button"
                className="w-full px-3 py-2.5 text-left text-ink hover:bg-cream/80"
                onClick={() => pick(onEditStatuses)}
              >
                Редактировать статусы
              </button>
            </li>
          </ul>
        </>
      ) : null}
    </div>
  )
}