import type { Guest, RsvpStatus } from '../../../core/types/entity'
import { RSVP_LABELS } from '../../../core/config/guests'
import { Button } from '../../../core/ui/Button'

interface GuestRowProps {
  guest: Guest
  onRsvpChange: (guestId: string, rsvp: RsvpStatus) => void
  onRemove: (guestId: string) => void
}

const RSVP_STYLES: Record<RsvpStatus, string> = {
  pending: 'bg-cream text-muted',
  yes: 'bg-green-100 text-green-800',
  no: 'bg-red-100 text-red-700',
}

export function GuestRow({ guest, onRsvpChange, onRemove }: GuestRowProps) {
  return (
    <li className="rounded-xl border border-cream-dark bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">
            {guest.name}
            {guest.plusOne ? (
              <span className="ml-1.5 text-xs font-normal text-muted">+1</span>
            ) : null}
          </p>
          {guest.guestGroup ? (
            <p className="mt-0.5 text-sm text-muted">{guest.guestGroup}</p>
          ) : null}
          {guest.notes ? (
            <p className="mt-1 text-sm text-muted/80">{guest.notes}</p>
          ) : null}
        </div>
        <Button variant="ghost" className="shrink-0 px-2 py-1 text-xs" onClick={() => onRemove(guest.id)}>
          Удалить
        </Button>
      </div>

      <div className="mt-3 flex gap-1.5">
        {(['pending', 'yes', 'no'] as const).map((rsvp) => (
          <button
            key={rsvp}
            type="button"
            onClick={() => onRsvpChange(guest.id, rsvp)}
            className={[
              'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
              guest.rsvp === rsvp ? RSVP_STYLES[rsvp] : 'bg-cream/60 text-muted hover:bg-cream',
            ].join(' ')}
          >
            {RSVP_LABELS[rsvp]}
          </button>
        ))}
      </div>
    </li>
  )
}
