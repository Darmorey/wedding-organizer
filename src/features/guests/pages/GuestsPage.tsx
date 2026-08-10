import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '../../auth/AuthProvider'
import { guestRepository } from '../../../data/repositories/guestRepository'
import { GuestRow } from '../components/GuestRow'
import { Button } from '../../../core/ui/Button'
import { Input } from '../../../core/ui/Input'
import { EmptyState } from '../../../core/ui/EmptyState'
import { GUEST_GROUPS } from '../../../core/config/guests'
import type { RsvpStatus } from '../../../core/types/entity'

type RsvpFilter = RsvpStatus | 'all'

export function GuestsPage() {
  const { activeProjectId } = useAuth()
  const [name, setName] = useState('')
  const [guestGroup, setGuestGroup] = useState<string>(GUEST_GROUPS[0])
  const [plusOne, setPlusOne] = useState(false)
  const [notes, setNotes] = useState('')
  const [rsvpFilter, setRsvpFilter] = useState<RsvpFilter>('all')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [submitting, setSubmitting] = useState(false)

  const stats = useLiveQuery(async () => {
    if (!activeProjectId) return { total: 0, yes: 0, no: 0, pending: 0 }
    return guestRepository.getStats(activeProjectId)
  }, [activeProjectId])

  const guests = useLiveQuery(async () => {
    if (!activeProjectId) return []
    return guestRepository.listByProject(activeProjectId, {
      rsvp: rsvpFilter,
      group: groupFilter,
    })
  }, [activeProjectId, rsvpFilter, groupFilter])

  const groups = useMemo(() => {
    const set = new Set<string>()
    for (const group of GUEST_GROUPS) set.add(group)
    for (const guest of guests ?? []) {
      if (guest.guestGroup) set.add(guest.guestGroup)
    }
    return [...set]
  }, [guests])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!activeProjectId || !name.trim()) return

    setSubmitting(true)
    try {
      await guestRepository.create(activeProjectId, {
        name,
        guestGroup,
        plusOne,
        notes,
      })
      setName('')
      setNotes('')
      setPlusOne(false)
    } finally {
      setSubmitting(false)
    }
  }

  const list = guests ?? []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-accent-dark">Гости</h2>
        <p className="mt-1 text-sm text-muted">Список приглашённых и RSVP</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="Всего" value={stats?.total ?? 0} />
        <StatCard label="Придут" value={stats?.yes ?? 0} accent="text-green-700" />
        <StatCard label="Не придут" value={stats?.no ?? 0} accent="text-red-600" />
        <StatCard label="Ждут ответ" value={stats?.pending ?? 0} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['all', 'Все'],
            ['yes', 'Придут'],
            ['no', 'Не придут'],
            ['pending', 'Ждут'],
          ] as const
        ).map(([value, label]) => (
          <FilterChip
            key={value}
            active={rsvpFilter === value}
            onClick={() => setRsvpFilter(value)}
          >
            {label}
          </FilterChip>
        ))}
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink">Группа</span>
        <select
          className="w-full rounded-xl border border-cream-dark bg-white px-3 py-2.5 text-sm"
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
        >
          <option value="all">Все группы</option>
          {groups.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
      </label>

      <form onSubmit={handleCreate} className="space-y-3 rounded-2xl border border-cream-dark bg-white p-4">
        <Input
          label="Имя гостя"
          name="guestName"
          placeholder="Иван Иванов"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink">Группа</span>
          <select
            className="w-full rounded-xl border border-cream-dark bg-white px-3 py-2.5 text-sm"
            value={guestGroup}
            onChange={(e) => setGuestGroup(e.target.value)}
          >
            {GUEST_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Заметки"
          name="guestNotes"
          placeholder="Опционально"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={plusOne}
            onChange={(e) => setPlusOne(e.target.checked)}
            className="size-4 rounded border-cream-dark"
          />
          С гостем (+1)
        </label>
        <Button type="submit" disabled={submitting || !name.trim()}>
          Добавить гостя
        </Button>
      </form>

      {list.length === 0 ? (
        <EmptyState
          title="Гостей пока нет"
          description="Добавьте первого гостя — список синхронизируется с партнёром."
        />
      ) : (
        <ul className="space-y-2">
          {list.map((guest) => (
            <GuestRow
              key={guest.id}
              guest={guest}
              onRsvpChange={(id, rsvp) => {
                if (!activeProjectId) return
                guestRepository.updateRsvp(activeProjectId, id, rsvp).catch(console.error)
              }}
              onRemove={(id) => {
                if (!activeProjectId) return
                guestRepository.remove(activeProjectId, id).catch(console.error)
              }}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  accent = 'text-accent-dark',
}: {
  label: string
  value: number
  accent?: string
}) {
  return (
    <div className="rounded-xl border border-cream-dark bg-white px-3 py-3 text-center">
      <p className={`text-2xl font-semibold ${accent}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
        active ? 'bg-accent-dark text-white' : 'bg-cream text-muted hover:bg-cream-dark/50',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
