import { useState } from 'react'

export function ManagerAddRow({
  disabled,
  placeholder,
  buttonLabel,
  onAdd,
}: {
  disabled?: boolean
  placeholder: string
  buttonLabel: string
  onAdd: (value: string) => void
}) {
  const [draft, setDraft] = useState('')

  function submit() {
    const trimmed = draft.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setDraft('')
  }

  return (
    <div className="flex gap-1.5 border-b border-cream-dark p-3">
      <input
        type="text"
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="min-w-0 flex-1 rounded-lg border border-cream-dark px-2 py-1.5 text-sm"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            submit()
          }
        }}
      />
      <ManagerRowAction disabled={disabled || !draft.trim()} onClick={submit}>
        {buttonLabel}
      </ManagerRowAction>
    </div>
  )
}

export function ManagerRowAction({
  children,
  disabled,
  onClick,
}: {
  children: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="shrink-0 rounded-lg bg-cream px-2 py-1 text-[11px] font-medium text-accent-dark hover:bg-cream-dark/50 disabled:opacity-40"
    >
      {children}
    </button>
  )
}