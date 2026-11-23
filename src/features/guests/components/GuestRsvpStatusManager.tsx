import { useState } from 'react'
import type { RsvpStatus } from '../../../core/types/entity'
import {
  RSVP_COMPACT_LABELS,
  RSVP_LABELS,
  RSVP_STATUSES,
  rsvpCompactLabel,
} from '../../../core/config/guests'
import type { CustomRsvpStatus } from '../../../core/config/guestProjectPrefs'
import { ManagerAddRow, ManagerRowAction } from './guestManagerUi'

interface GuestRsvpStatusManagerProps {
  disabled?: boolean
  customStatuses: CustomRsvpStatus[]
  guestCountByRsvp: Record<string, number>
  onAdd: (label: string) => void
  onRenameLabel: (id: string, label: string) => void
  onDelete: (id: string, reassignTo: RsvpStatus) => Promise<void>
}

export function GuestRsvpStatusManager({
  disabled,
  customStatuses,
  guestCountByRsvp,
  onAdd,
  onRenameLabel,
  onDelete,
}: GuestRsvpStatusManagerProps) {
  return (
    <div className="text-sm">
      <ManagerAddRow
        disabled={disabled}
        placeholder="Новый статус"
        buttonLabel="Добавить"
        onAdd={onAdd}
      />
      <p className="border-b border-cream-dark px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted">
        Стандартные
      </p>
      <ul className="divide-y divide-cream-dark/80 border-b border-cream-dark">
        {RSVP_STATUSES.map((status) => (
          <li key={status} className="flex items-center justify-between gap-2 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{RSVP_COMPACT_LABELS[status]}</p>
              <p className="text-[11px] text-muted">{RSVP_LABELS[status]}</p>
            </div>
            <span className="shrink-0 text-[11px] text-muted">
              {guestCountByRsvp[status] ?? 0} гост.
            </span>
          </li>
        ))}
      </ul>
      <p className="border-b border-cream-dark px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted">
        Свои
      </p>
      <ul className="divide-y divide-cream-dark/80">
        {customStatuses.length === 0 ? (
          <li className="px-3 py-3 text-xs text-muted">Пока нет своих статусов.</li>
        ) : (
          customStatuses.map((status) => (
            <CustomStatusRow
              key={status.id}
              disabled={disabled}
              status={status}
              guestCount={guestCountByRsvp[status.id] ?? 0}
              onRenameLabel={onRenameLabel}
              onDelete={onDelete}
            />
          ))
        )}
      </ul>
    </div>
  )
}

function CustomStatusRow({
  disabled,
  status,
  guestCount,
  onRenameLabel,
  onDelete,
}: {
  disabled?: boolean
  status: CustomRsvpStatus
  guestCount: number
  onRenameLabel: (id: string, label: string) => void
  onDelete: (id: string, reassignTo: RsvpStatus) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(status.label)
  const [deleting, setDeleting] = useState(false)
  const [reassignTo, setReassignTo] = useState<RsvpStatus>('pending')
  const [busy, setBusy] = useState(false)

  async function saveRename() {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === status.label) {
      setEditing(false)
      setDraft(status.label)
      return
    }
    onRenameLabel(status.id, trimmed)
    setEditing(false)
  }

  async function confirmDelete() {
    setBusy(true)
    try {
      await onDelete(status.id, reassignTo)
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
                setDraft(status.label)
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
              setDraft(status.label)
            }}
          >
            Отм.
          </ManagerRowAction>
        </div>
      ) : deleting ? (
        <div className="space-y-1.5">
          <p className="text-xs text-muted">
            {guestCount > 0
              ? `Перенести ${guestCount} гост. со статуса «${rsvpCompactLabel(status.id, [status])}» и удалить его?`
              : `Удалить статус «${rsvpCompactLabel(status.id, [status])}»?`}
          </p>
          {guestCount > 0 ? (
            <select
              value={reassignTo}
              disabled={disabled || busy}
              onChange={(e) => setReassignTo(e.target.value as RsvpStatus)}
              className="w-full rounded-lg border border-cream-dark px-2 py-1.5 text-sm"
            >
              {RSVP_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {RSVP_COMPACT_LABELS[s]}
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
            <p className="truncate text-sm font-medium text-ink">{status.label}</p>
            <p className="text-[11px] text-muted">
              {guestCount} {guestCount === 1 ? 'гость' : guestCount < 5 ? 'гостя' : 'гостей'}
            </p>
          </div>
          <ManagerRowAction disabled={disabled || busy} onClick={() => setEditing(true)}>
            Изм.
          </ManagerRowAction>
          <ManagerRowAction
            disabled={disabled || busy}
            onClick={() => {
              setReassignTo('pending')
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