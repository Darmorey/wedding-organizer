import { useState } from 'react'
import { guestGroupShortLabel, isBuiltinGuestGroup } from '../../../core/config/guests'
import { ManagerAddRow, ManagerRowAction } from './guestManagerUi'

interface GuestCategoryManagerProps {
  disabled?: boolean
  groups: string[]
  guestCountByGroup: Record<string, number>
  onAdd: (name: string) => void
  onRename: (from: string, to: string) => Promise<void>
  onDelete: (group: string, reassignTo: string) => Promise<void>
}

export function GuestCategoryManager({
  disabled,
  groups,
  guestCountByGroup,
  onAdd,
  onRename,
  onDelete,
}: GuestCategoryManagerProps) {
  return (
    <div className="text-sm">
      <ManagerAddRow
        disabled={disabled}
        placeholder="Новая категория"
        buttonLabel="Добавить"
        onAdd={onAdd}
      />
      <ul className="divide-y divide-cream-dark/80">
        {groups.map((group) => (
          <CategoryRow
            key={group}
            disabled={disabled}
            group={group}
            guestCount={guestCountByGroup[group] ?? 0}
            otherGroups={groups.filter((g) => g !== group)}
            canDelete={groups.length > 1}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </div>
  )
}

function CategoryRow({
  disabled,
  group,
  guestCount,
  otherGroups,
  canDelete,
  onRename,
  onDelete,
}: {
  disabled?: boolean
  group: string
  guestCount: number
  otherGroups: string[]
  canDelete: boolean
  onRename: (from: string, to: string) => Promise<void>
  onDelete: (group: string, reassignTo: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(group)
  const [deleting, setDeleting] = useState(false)
  const [reassignTo, setReassignTo] = useState(otherGroups[0] ?? '')
  const [busy, setBusy] = useState(false)

  const fullTitle = isBuiltinGuestGroup(group) ? group : group
  const short = guestGroupShortLabel(group)

  async function saveRename() {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === group) {
      setEditing(false)
      setDraft(group)
      return
    }
    setBusy(true)
    try {
      await onRename(group, trimmed)
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (!canDelete) return
    if (guestCount > 0 && !reassignTo) return
    setBusy(true)
    try {
      await onDelete(group, guestCount > 0 ? reassignTo : otherGroups[0] ?? '')
      setDeleting(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="px-3 py-2">
      {editing ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            type="text"
            value={draft}
            disabled={disabled || busy}
            onChange={(e) => setDraft(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-cream-dark px-2 py-1.5 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') void saveRename()
              if (e.key === 'Escape') {
                setEditing(false)
                setDraft(group)
              }
            }}
          />
          <ManagerRowAction disabled={disabled || busy} onClick={() => void saveRename()}>
            OK
          </ManagerRowAction>
          <ManagerRowAction
            disabled={disabled || busy}
            onClick={() => {
              setEditing(false)
              setDraft(group)
            }}
          >
            Отм.
          </ManagerRowAction>
        </div>
      ) : deleting ? (
        <div className="space-y-1.5">
          <p className="text-xs text-muted">
            {guestCount > 0
              ? `Перенести ${guestCount} гост. из «${short}» в другую категорию и удалить её?`
              : `Удалить категорию «${short}»?`}
          </p>
          {guestCount > 0 ? (
            <select
              value={reassignTo}
              disabled={disabled || busy}
              onChange={(e) => setReassignTo(e.target.value)}
              className="w-full rounded-lg border border-cream-dark px-2 py-1.5 text-sm"
            >
              {otherGroups.map((g) => (
                <option key={g} value={g}>
                  {guestGroupShortLabel(g)}
                  {isBuiltinGuestGroup(g) ? ` (${g})` : ''}
                </option>
              ))}
            </select>
          ) : null}
          <div className="flex gap-1.5">
            <ManagerRowAction disabled={disabled || busy} onClick={() => void confirmDelete()}>
              Удалить
            </ManagerRowAction>
            <ManagerRowAction disabled={disabled || busy} onClick={() => setDeleting(false)}>
              Отм.
            </ManagerRowAction>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink" title={fullTitle}>
              {short}
              {isBuiltinGuestGroup(group) ? (
                <span className="ml-1 text-xs font-normal text-muted">({group})</span>
              ) : null}
            </p>
            <p className="text-[11px] text-muted">
              {guestCount} {guestCount === 1 ? 'гость' : guestCount < 5 ? 'гостя' : 'гостей'}
            </p>
          </div>
          <ManagerRowAction disabled={disabled || busy} onClick={() => setEditing(true)}>
            Изм.
          </ManagerRowAction>
          <ManagerRowAction
            disabled={disabled || busy || !canDelete}
            onClick={() => {
              setReassignTo(otherGroups[0] ?? '')
              setDeleting(true)
            }}
          >
            Уд.
          </ManagerRowAction>
        </div>
      )}
    </li>
  )
}