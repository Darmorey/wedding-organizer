import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '../../auth/AuthProvider'
import { guestRepository } from '../../../data/repositories/guestRepository'
import { GuestRow } from '../components/GuestRow'
import { GuestQuickAdd } from '../components/GuestQuickAdd'
import { GuestCategoryManager } from '../components/GuestCategoryManager'
import { GuestRsvpStatusManager } from '../components/GuestRsvpStatusManager'
import { GuestSheetModal } from '../components/GuestSheetModal'
import { GuestsOverflowMenu } from '../components/GuestsOverflowMenu'
import { EmptyState } from '../../../core/ui/EmptyState'
import {
  GUEST_COMPACT_SELECT_CLASS,
  GUEST_GROUPS,
  RSVP_COMPACT_LABELS,
  RSVP_STATUSES,
  createCustomRsvpId,
  guestGroupShortLabel,
  isBuiltinGuestGroup,
  mergeGuestGroupOptions,
  rsvpCompactLabel,
} from '../../../core/config/guests'
import {
  addCustomGuestGroup,
  addCustomRsvpStatus,
  hideBuiltinGuestGroup,
  readCustomGuestGroups,
  readCustomRsvpStatuses,
  readHiddenBuiltinGuestGroups,
  removeCustomGuestGroup,
  removeCustomRsvpStatus,
  replaceCustomGuestGroup,
  updateCustomRsvpStatusLabel,
  type CustomRsvpStatus,
} from '../../../core/config/guestProjectPrefs'
import type { RsvpStatus } from '../../../core/types/entity'

type RsvpFilter = RsvpStatus | 'all'
type GuestsSettingsPanel = 'categories' | 'statuses' | null

const EMPTY_STATS = {
  total: 0,
  invited: 0,
  yes: 0,
  no: 0,
  pending: 0,
  notInvited: 0,
  attendingPeople: 0,
  attendingAdults: 0,
  attendingChildren: 0,
  expectedPeople: 0,
  expectedAdults: 0,
  expectedChildren: 0,
}

const LAST_GROUP_KEY = 'wedding-organizer:guest-last-group'

function readLastGroup(): string {
  const stored = localStorage.getItem(LAST_GROUP_KEY)?.trim()
  if (stored) return stored
  return GUEST_GROUPS[0]
}

export function GuestsPage() {
  const { activeProjectId } = useAuth()
  const [quickAddGroup, setQuickAddGroup] = useState(readLastGroup)
  const [rsvpFilter, setRsvpFilter] = useState<RsvpFilter>('all')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [customGroups, setCustomGroups] = useState<string[]>([])
  const [customRsvpStatuses, setCustomRsvpStatuses] = useState<CustomRsvpStatus[]>([])
  const [hiddenBuiltinGroups, setHiddenBuiltinGroups] = useState<string[]>([])
  const [settingsPanel, setSettingsPanel] = useState<GuestsSettingsPanel>(null)

  useEffect(() => {
    if (!activeProjectId) {
      setCustomGroups([])
      setCustomRsvpStatuses([])
      setHiddenBuiltinGroups([])
      return
    }
    setCustomGroups(readCustomGuestGroups(activeProjectId))
    setCustomRsvpStatuses(readCustomRsvpStatuses(activeProjectId))
    setHiddenBuiltinGroups(readHiddenBuiltinGuestGroups(activeProjectId))
  }, [activeProjectId])

  const stats = useLiveQuery(async () => {
    if (!activeProjectId) return EMPTY_STATS
    return guestRepository.getStats(activeProjectId)
  }, [activeProjectId])

  const allGuests = useLiveQuery(async () => {
    if (!activeProjectId) return []
    return guestRepository.listByProject(activeProjectId)
  }, [activeProjectId])

  const guests = useLiveQuery(async () => {
    if (!activeProjectId) return []
    return guestRepository.listByProject(activeProjectId, {
      rsvp: rsvpFilter,
      group: groupFilter,
    })
  }, [activeProjectId, rsvpFilter, groupFilter])

  const groups = useMemo(
    () => mergeGuestGroupOptions(allGuests ?? [], customGroups, hiddenBuiltinGroups),
    [allGuests, customGroups, hiddenBuiltinGroups],
  )

  const guestCountByGroup = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const guest of allGuests ?? []) {
      const key = guest.guestGroup
      counts[key] = (counts[key] ?? 0) + 1
    }
    return counts
  }, [allGuests])

  const guestCountByRsvp = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const guest of allGuests ?? []) {
      counts[guest.rsvp] = (counts[guest.rsvp] ?? 0) + 1
    }
    return counts
  }, [allGuests])

  const list = guests ?? []

  const allCustomRsvpStatuses = useMemo(() => {
    const byId = new Map<string, CustomRsvpStatus>()
    for (const status of customRsvpStatuses) byId.set(status.id, status)
    for (const guest of list) {
      if (guest.rsvp.startsWith('custom:') && !byId.has(guest.rsvp)) {
        byId.set(guest.rsvp, {
          id: guest.rsvp,
          label: guest.rsvp.replace(/^custom:/, ''),
        })
      }
    }
    return [...byId.values()]
  }, [customRsvpStatuses, list])

  function handleGroupChangeForNew(group: string) {
    setQuickAddGroup(group)
    localStorage.setItem(LAST_GROUP_KEY, group)
  }

  function handleAddCustomGroup(name: string) {
    if (!activeProjectId) return
    const trimmed = name.trim()
    if (!trimmed) return
    if (groups.includes(trimmed)) {
      window.alert('Такая категория уже есть.')
      return
    }
    setCustomGroups(addCustomGuestGroup(activeProjectId, trimmed))
  }

  async function handleRenameGroup(from: string, to: string) {
    if (!activeProjectId) return
    const trimmed = to.trim()
    if (!trimmed || from === trimmed) return
    if (groups.includes(trimmed) && trimmed !== from) {
      window.alert('Такая категория уже есть.')
      return
    }

    await guestRepository.renameGuestGroup(activeProjectId, from, trimmed)

    if (isBuiltinGuestGroup(from)) {
      setHiddenBuiltinGroups(hideBuiltinGuestGroup(activeProjectId, from))
      if (!isBuiltinGuestGroup(trimmed)) {
        setCustomGroups(addCustomGuestGroup(activeProjectId, trimmed))
      }
    } else {
      setCustomGroups(replaceCustomGuestGroup(activeProjectId, from, trimmed))
    }

    if (quickAddGroup === from) handleGroupChangeForNew(trimmed)
    if (groupFilter === from) setGroupFilter(trimmed)
  }

  async function handleDeleteGroup(group: string, reassignTo: string) {
    if (!activeProjectId) return
    const count = guestCountByGroup[group] ?? 0
    if (count > 0) {
      if (!reassignTo || reassignTo === group) return
      await guestRepository.renameGuestGroup(activeProjectId, group, reassignTo)
    }

    if (isBuiltinGuestGroup(group)) {
      setHiddenBuiltinGroups(hideBuiltinGuestGroup(activeProjectId, group))
    } else {
      setCustomGroups(removeCustomGuestGroup(activeProjectId, group))
    }

    const fallback = groups.find((g) => g !== group) ?? GUEST_GROUPS[0]
    if (quickAddGroup === group) handleGroupChangeForNew(reassignTo || fallback)
    if (groupFilter === group) setGroupFilter('all')
  }

  function handleAddCustomRsvp(label: string) {
    if (!activeProjectId) return
    const trimmed = label.trim()
    if (!trimmed) return
    const entry: CustomRsvpStatus = { id: createCustomRsvpId(), label: trimmed }
    setCustomRsvpStatuses(addCustomRsvpStatus(activeProjectId, entry))
  }

  function handleRenameRsvpLabel(id: string, label: string) {
    if (!activeProjectId) return
    setCustomRsvpStatuses(updateCustomRsvpStatusLabel(activeProjectId, id, label))
  }

  async function handleDeleteCustomRsvp(id: string, reassignTo: RsvpStatus) {
    if (!activeProjectId) return
    const count = guestCountByRsvp[id] ?? 0
    if (count > 0) await guestRepository.reassignRsvpStatus(activeProjectId, id, reassignTo)
    setCustomRsvpStatuses(removeCustomRsvpStatus(activeProjectId, id))
    if (rsvpFilter === id) setRsvpFilter('all')
  }

  async function handleQuickAdd(input: {
    name: string
    guestGroup: string
    plusOne: boolean
    plusOneIsChild: boolean
  }) {
    if (!activeProjectId) return
    await guestRepository.create(activeProjectId, {
      name: input.name,
      guestGroup: input.guestGroup,
      plusOne: input.plusOne,
      plusOneIsChild: input.plusOneIsChild,
      notes: '',
      rsvp: 'pending',
    })
  }

  const s = stats ?? EMPTY_STATS

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-xl font-semibold text-accent-dark">Гости</h2>
        <GuestsOverflowMenu
          disabled={!activeProjectId}
          onEditCategories={() => setSettingsPanel('categories')}
          onEditStatuses={() => setSettingsPanel('statuses')}
        />
      </div>

      {settingsPanel === 'categories' ? (
        <GuestSheetModal title="Категории" onClose={() => setSettingsPanel(null)}>
          <GuestCategoryManager
            disabled={!activeProjectId}
            groups={groups}
            guestCountByGroup={guestCountByGroup}
            onAdd={handleAddCustomGroup}
            onRename={handleRenameGroup}
            onDelete={handleDeleteGroup}
          />
        </GuestSheetModal>
      ) : null}

      {settingsPanel === 'statuses' ? (
        <GuestSheetModal title="Статусы" onClose={() => setSettingsPanel(null)}>
          <GuestRsvpStatusManager
            disabled={!activeProjectId}
            customStatuses={customRsvpStatuses}
            guestCountByRsvp={guestCountByRsvp}
            onAdd={handleAddCustomRsvp}
            onRenameLabel={handleRenameRsvpLabel}
            onDelete={handleDeleteCustomRsvp}
          />
        </GuestSheetModal>
      ) : null}

      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">На свадьбе</p>
        <StatsGrid>
          <MiniStat label="Подтв." value={s.attendingPeople} accent="text-green-700" />
          <MiniStat label="Взр." value={s.attendingAdults} />
          <MiniStat label="Дети" value={s.attendingChildren} accent="text-amber-800" />
          <MiniStat label="Ожид." value={s.expectedPeople} />
        </StatsGrid>
      </div>

      <details className="rounded-xl border border-cream-dark bg-white text-sm">
        <summary className="cursor-pointer px-3 py-2 text-muted">Статистика RSVP</summary>
        <div className="flex flex-wrap gap-1 border-t border-cream-dark p-2">
          <MiniStat compact label="Список" value={s.invited} className="min-w-[4.5rem] flex-1" />
          <MiniStat compact label="Да" value={s.yes} className="min-w-[4.5rem] flex-1" />
          <MiniStat compact label="Нет" value={s.no} className="min-w-[4.5rem] flex-1" />
          <MiniStat compact label="Ждут" value={s.pending} className="min-w-[4.5rem] flex-1" />
          <MiniStat compact label="Отказ" value={s.notInvited} className="min-w-[4.5rem] flex-1" />
          {allCustomRsvpStatuses.map((status) => (
            <MiniStat
              compact
              key={status.id}
              className="min-w-[4.5rem] flex-1"
              label={rsvpCompactLabel(status.id, allCustomRsvpStatuses)}
              value={list.filter((g) => g.rsvp === status.id).length}
            />
          ))}
        </div>
      </details>

      <GuestQuickAdd
        disabled={!activeProjectId}
        guestGroup={quickAddGroup}
        groupOptions={groups}
        onGroupChange={handleGroupChangeForNew}
        onAdd={handleQuickAdd}
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-cream-dark bg-white px-3 py-2">
        <label className="flex items-center gap-1.5">
          <span className="shrink-0 text-[11px] font-medium text-muted">Статус</span>
          <select
            className={GUEST_COMPACT_SELECT_CLASS}
            value={rsvpFilter}
            onChange={(e) => setRsvpFilter(e.target.value as RsvpFilter)}
          >
            <option value="all">Все</option>
            {RSVP_STATUSES.map((status) => (
              <option key={status} value={status}>
                {RSVP_COMPACT_LABELS[status]}
              </option>
            ))}
            {allCustomRsvpStatuses.map((status) => (
              <option key={status.id} value={status.id}>
                {rsvpCompactLabel(status.id, allCustomRsvpStatuses)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="shrink-0 text-[11px] font-medium text-muted">Категория</span>
          <select
            className={GUEST_COMPACT_SELECT_CLASS}
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
          >
            <option value="all">Все</option>
            {groups.map((group) => (
              <option key={group} value={group}>
                {guestGroupShortLabel(group)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="Гостей пока нет"
          description="Выберите категорию и вводите имена сверху."
        />
      ) : (
        <ul className="rounded-xl border border-cream-dark bg-white px-2">
          {list.map((guest) => (
            <GuestRow
              key={guest.id}
              guest={guest}
              groupOptions={groups}
              customRsvpStatuses={allCustomRsvpStatuses}
              onRsvpChange={(id, rsvp) => {
                if (!activeProjectId) return
                guestRepository.updateRsvp(activeProjectId, id, rsvp).catch(console.error)
              }}
              onGroupChange={(id, guestGroup) => {
                if (!activeProjectId) return
                guestRepository.update(activeProjectId, id, { guestGroup }).catch(console.error)
              }}
              onCompanionChange={(id, plusOne, plusOneIsChild) => {
                if (!activeProjectId) return
                guestRepository
                  .updateCompanion(activeProjectId, id, plusOne, plusOneIsChild)
                  .catch(console.error)
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

function StatsGrid({
  children,
  className = '',
  columns = 4,
}: {
  children: ReactNode
  className?: string
  columns?: 4 | 5
}) {
  const colClass = columns === 5 ? 'grid-cols-5' : 'grid-cols-4'
  return <div className={['grid gap-1', colClass, className].join(' ')}>{children}</div>
}

function MiniStat({
  label,
  value,
  accent = 'text-accent-dark',
  compact = false,
  className = '',
}: {
  label: string
  value: number
  accent?: string
  compact?: boolean
  className?: string
}) {
  return (
    <div
      className={[
        compact
          ? 'min-w-0 rounded-lg bg-cream/50 px-1 py-1 text-center'
          : 'rounded-lg bg-cream/50 px-2 py-1.5 text-center',
        className,
      ].join(' ')}
    >
      <p
        className={`font-semibold leading-tight ${compact ? 'text-sm' : 'text-base'} ${accent}`}
      >
        {value}
      </p>
      <p className={`truncate text-muted ${compact ? 'text-[9px] leading-tight' : 'text-[10px]'}`}>
        {label}
      </p>
    </div>
  )
}
