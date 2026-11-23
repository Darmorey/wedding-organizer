import type { Guest, RsvpStatus } from '../../../core/types/entity'
import {
  GUEST_COMPACT_SELECT_CLASS,
  RSVP_STATUSES,
  guestGroupShortLabel,
  isBuiltinRsvpStatus,
  rsvpCompactLabel,
} from '../../../core/config/guests'
import type { CustomRsvpStatus } from '../../../core/config/guestProjectPrefs'

interface GuestRowProps {
  guest: Guest
  groupOptions: string[]
  customRsvpStatuses: CustomRsvpStatus[]
  onRsvpChange: (guestId: string, rsvp: RsvpStatus) => void
  onGroupChange: (guestId: string, guestGroup: string) => void
  onCompanionChange: (guestId: string, plusOne: boolean, plusOneIsChild: boolean) => void
  onRemove: (guestId: string) => void
}

export function GuestRow({
  guest,
  groupOptions,
  customRsvpStatuses,
  onRsvpChange,
  onGroupChange,
  onCompanionChange,
  onRemove,
}: GuestRowProps) {
  const showCompanion = guest.rsvp !== 'not_invited'
  const groupValue =
    groupOptions.includes(guest.guestGroup) ? guest.guestGroup : guest.guestGroup || groupOptions[0]

  return (
    <li className="flex items-center gap-1.5 border-b border-cream-dark/80 py-2 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">
          {guest.name}
          {showCompanion && guest.plusOne ? (
            <span className="ml-1 text-xs font-normal text-muted">
              +1{guest.plusOneIsChild ? ' 👶' : ''}
            </span>
          ) : null}
        </p>
        {guest.notes ? (
          <p className="truncate text-[11px] text-muted">{guest.notes}</p>
        ) : null}
      </div>

      {showCompanion ? (
        <div className="flex shrink-0 gap-0.5">
          <button
            type="button"
            aria-label="Переключить +1"
            onClick={() =>
              onCompanionChange(
                guest.id,
                !guest.plusOne,
                guest.plusOne ? (guest.plusOneIsChild ?? false) : false,
              )
            }
            className={[
              'rounded px-1.5 py-0.5 text-[10px] font-semibold',
              guest.plusOne ? 'bg-accent-dark text-white' : 'bg-cream text-muted',
            ].join(' ')}
          >
            +1
          </button>
          {guest.plusOne ? (
            <button
              type="button"
              aria-label="Ребёнок или взрослый +1"
              onClick={() =>
                onCompanionChange(guest.id, true, !(guest.plusOneIsChild ?? false))
              }
              className={[
                'rounded px-1 py-0.5 text-[10px]',
                guest.plusOneIsChild ? 'bg-amber-100' : 'bg-cream text-muted',
              ].join(' ')}
            >
              👶
            </button>
          ) : null}
        </div>
      ) : null}

      <select
        className={GUEST_COMPACT_SELECT_CLASS}
        value={groupValue}
        title={groupValue}
        onChange={(e) => onGroupChange(guest.id, e.target.value)}
      >
        {groupOptions.map((group) => (
          <option key={group} value={group}>
            {guestGroupShortLabel(group)}
          </option>
        ))}
      </select>

      <select
        className={GUEST_COMPACT_SELECT_CLASS}
        value={guest.rsvp}
        title={rsvpCompactLabel(guest.rsvp, customRsvpStatuses)}
        onChange={(e) => onRsvpChange(guest.id, e.target.value as RsvpStatus)}
      >
        {RSVP_STATUSES.map((rsvp) => (
          <option key={rsvp} value={rsvp}>
            {rsvpCompactLabel(rsvp, customRsvpStatuses)}
          </option>
        ))}
        {customRsvpStatuses.map((status) => (
          <option key={status.id} value={status.id}>
            {rsvpCompactLabel(status.id, customRsvpStatuses)}
          </option>
        ))}
        {!isBuiltinRsvpStatus(guest.rsvp) && !customRsvpStatuses.some((s) => s.id === guest.rsvp) ? (
          <option value={guest.rsvp}>{rsvpCompactLabel(guest.rsvp, customRsvpStatuses)}</option>
        ) : null}
      </select>

      <button
        type="button"
        aria-label="Удалить"
        onClick={() => onRemove(guest.id)}
        className="shrink-0 rounded-lg px-1.5 py-1 text-sm text-muted hover:bg-red-50 hover:text-red-600"
      >
        ×
      </button>
    </li>
  )
}