import { useRef, useState, type FormEvent } from 'react'
import { AddButton } from '../../../core/ui/AddButton'
import { GUEST_GROUPS, GUEST_GROUP_SHORT, guestGroupShortLabel } from '../../../core/config/guests'

interface GuestQuickAddProps {
  disabled?: boolean
  guestGroup: string
  groupOptions: string[]
  onGroupChange: (group: string) => void
  onAdd: (input: {
    name: string
    guestGroup: string
    plusOne: boolean
    plusOneIsChild: boolean
  }) => Promise<void>
}

export function GuestQuickAdd({
  disabled,
  guestGroup,
  groupOptions,
  onGroupChange,
  onAdd,
}: GuestQuickAddProps) {
  const [name, setName] = useState('')
  const [plusOne, setPlusOne] = useState(false)
  const [plusOneIsChild, setPlusOneIsChild] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const presetGroups = GUEST_GROUPS.filter((g) => groupOptions.includes(g))
  const customOnlyGroups = groupOptions.filter(
    (g) => !GUEST_GROUPS.includes(g as (typeof GUEST_GROUPS)[number]),
  )

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || submitting) return

    setSubmitting(true)
    try {
      await onAdd({
        name: name.trim(),
        guestGroup,
        plusOne,
        plusOneIsChild: plusOne && plusOneIsChild,
      })
      setName('')
      setPlusOne(false)
      setPlusOneIsChild(false)
      inputRef.current?.focus()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 rounded-2xl border border-accent/30 bg-white p-3 shadow-sm"
    >
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Имя гостя"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-xl border border-cream-dark bg-white px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        <div className="flex shrink-0 items-center gap-1">
          <ToggleChip
            active={plusOne}
            onClick={() => {
              setPlusOne((v) => {
                if (v) setPlusOneIsChild(false)
                return !v
              })
            }}
          >
            +1
          </ToggleChip>
          {plusOne ? (
            <ToggleChip active={plusOneIsChild} onClick={() => setPlusOneIsChild((v) => !v)}>
              👶
            </ToggleChip>
          ) : null}
        </div>
        <AddButton
          type="submit"
          busy={submitting}
          disabled={disabled || submitting || !name.trim()}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {presetGroups.map((group) => (
          <ToggleChip
            key={group}
            active={guestGroup === group}
            onClick={() => onGroupChange(group)}
            title={group}
          >
            {GUEST_GROUP_SHORT[group]}
          </ToggleChip>
        ))}
        {customOnlyGroups.map((group) => (
          <ToggleChip
            key={group}
            active={guestGroup === group}
            onClick={() => onGroupChange(group)}
            title={group}
          >
            {guestGroupShortLabel(group)}
          </ToggleChip>
        ))}
      </div>
    </form>
  )
}

function ToggleChip({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean
  onClick: () => void
  children: string
  title?: string
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        'rounded-lg px-2.5 py-2 text-xs font-medium transition-colors',
        active ? 'bg-accent-dark text-white' : 'bg-cream text-muted hover:bg-cream-dark/60',
      ].join(' ')}
    >
      {children}
    </button>
  )
}