import type { Guest, RsvpStatus } from '../../core/types/entity'
import { getGuestHeadcountSummary } from '../../core/utils/guestHeadcount'
import { createId, nowIso } from '../../core/utils/id'
import { db } from '../db/database'
import { assertProjectId, enqueueSync } from './baseRepository'

export interface GuestFilters {
  rsvp?: RsvpStatus | 'all'
  group?: string | 'all'
}

export interface GuestStats {
  total: number
  invited: number
  yes: number
  no: number
  pending: number
  notInvited: number
  /** Люди (не строки): подтвердили приход */
  attendingPeople: number
  attendingAdults: number
  attendingChildren: number
  /** Люди: ждут ответ + придут */
  expectedPeople: number
  expectedAdults: number
  expectedChildren: number
}

export const guestRepository = {
  async listByProject(projectId: string, filters: GuestFilters = {}): Promise<Guest[]> {
    assertProjectId(projectId)
    let rows = await db.guests.where('projectId').equals(projectId).toArray()
    rows = rows.filter((row) => !row.deletedAt)

    if (filters.rsvp && filters.rsvp !== 'all') {
      rows = rows.filter((row) => row.rsvp === filters.rsvp)
    }
    if (filters.group && filters.group !== 'all') {
      rows = rows.filter((row) => row.guestGroup === filters.group)
    }

    return rows
      .map((row) => ({
        ...row,
        plusOneIsChild: row.plusOneIsChild ?? false,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  },

  async getStats(projectId: string): Promise<GuestStats> {
    assertProjectId(projectId)
    const guests = await this.listByProject(projectId)
    const notInvited = guests.filter((g) => g.rsvp === 'not_invited').length
    const invited = guests.length - notInvited
    const headcount = getGuestHeadcountSummary(guests)

    return {
      total: guests.length,
      invited,
      yes: guests.filter((g) => g.rsvp === 'yes').length,
      no: guests.filter((g) => g.rsvp === 'no').length,
      pending: guests.filter((g) => g.rsvp === 'pending').length,
      notInvited,
      attendingPeople: headcount.attending.total,
      attendingAdults: headcount.attending.adults,
      attendingChildren: headcount.attending.children,
      expectedPeople: headcount.expected.total,
      expectedAdults: headcount.expected.adults,
      expectedChildren: headcount.expected.children,
    }
  },

  async create(
    projectId: string,
    input: Pick<Guest, 'name' | 'guestGroup' | 'plusOne' | 'plusOneIsChild' | 'notes'> & {
      rsvp?: RsvpStatus
    },
  ): Promise<Guest> {
    assertProjectId(projectId)
    const now = nowIso()
    const plusOne = input.rsvp === 'not_invited' ? false : input.plusOne

    const guest: Guest = {
      id: createId(),
      projectId,
      name: input.name.trim(),
      guestGroup: input.guestGroup.trim(),
      rsvp: input.rsvp ?? 'pending',
      plusOne,
      plusOneIsChild: plusOne ? input.plusOneIsChild : false,
      notes: input.notes.trim(),
      metadata: {},
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }

    await db.guests.put(guest)
    await enqueueSync(projectId, 'guests', guest.id, 'upsert')
    return guest
  },

  async updateRsvp(projectId: string, guestId: string, rsvp: RsvpStatus): Promise<Guest> {
    assertProjectId(projectId)
    const guest = await db.guests.get(guestId)
    if (!guest || guest.projectId !== projectId || guest.deletedAt) {
      throw new Error('Guest not found')
    }

    const updated: Guest = {
      ...guest,
      rsvp,
      plusOne: rsvp === 'not_invited' ? false : guest.plusOne,
      plusOneIsChild: rsvp === 'not_invited' ? false : guest.plusOneIsChild ?? false,
      updatedAt: nowIso(),
    }

    await db.guests.put(updated)
    await enqueueSync(projectId, 'guests', guestId, 'upsert')
    return updated
  },

  async updateCompanion(
    projectId: string,
    guestId: string,
    plusOne: boolean,
    plusOneIsChild: boolean,
  ): Promise<Guest> {
    assertProjectId(projectId)
    const guest = await db.guests.get(guestId)
    if (!guest || guest.projectId !== projectId || guest.deletedAt) {
      throw new Error('Guest not found')
    }
    if (guest.rsvp === 'not_invited') {
      throw new Error('Cannot set companion for declined invite')
    }

    const updated: Guest = {
      ...guest,
      plusOne,
      plusOneIsChild: plusOne ? plusOneIsChild : false,
      updatedAt: nowIso(),
    }

    await db.guests.put(updated)
    await enqueueSync(projectId, 'guests', guestId, 'upsert')
    return updated
  },

  async update(
    projectId: string,
    guestId: string,
    input: Partial<Pick<Guest, 'name' | 'guestGroup' | 'rsvp' | 'plusOne' | 'plusOneIsChild' | 'notes'>>,
  ): Promise<Guest> {
    assertProjectId(projectId)
    const guest = await db.guests.get(guestId)
    if (!guest || guest.projectId !== projectId || guest.deletedAt) {
      throw new Error('Guest not found')
    }

    const plusOne = input.plusOne ?? guest.plusOne
    const updated: Guest = {
      ...guest,
      ...input,
      name: input.name?.trim() ?? guest.name,
      guestGroup: input.guestGroup?.trim() ?? guest.guestGroup,
      notes: input.notes?.trim() ?? guest.notes,
      plusOne,
      plusOneIsChild: plusOne ? (input.plusOneIsChild ?? guest.plusOneIsChild ?? false) : false,
      updatedAt: nowIso(),
    }

    await db.guests.put(updated)
    await enqueueSync(projectId, 'guests', guestId, 'upsert')
    return updated
  },

  async reassignRsvpStatus(projectId: string, fromStatus: string, toStatus: RsvpStatus): Promise<number> {
    assertProjectId(projectId)
    if (!fromStatus || fromStatus === toStatus) return 0

    const rows = await db.guests.where('projectId').equals(projectId).toArray()
    let updated = 0
    for (const guest of rows) {
      if (guest.deletedAt || guest.rsvp !== fromStatus) continue
      await this.updateRsvp(projectId, guest.id, toStatus)
      updated++
    }
    return updated
  },

  async renameGuestGroup(projectId: string, fromGroup: string, toGroup: string): Promise<number> {
    assertProjectId(projectId)
    const from = fromGroup.trim()
    const to = toGroup.trim()
    if (!from || !to || from === to) return 0

    const rows = await db.guests.where('projectId').equals(projectId).toArray()
    let updated = 0
    for (const guest of rows) {
      if (guest.deletedAt || guest.guestGroup !== from) continue
      await this.update(projectId, guest.id, { guestGroup: to })
      updated++
    }
    return updated
  },

  async remove(projectId: string, guestId: string): Promise<void> {
    assertProjectId(projectId)
    const guest = await db.guests.get(guestId)
    if (!guest || guest.projectId !== projectId || guest.deletedAt) return

    const updated: Guest = {
      ...guest,
      updatedAt: nowIso(),
      deletedAt: nowIso(),
    }

    await db.guests.put(updated)
    await enqueueSync(projectId, 'guests', guestId, 'upsert')
  },
}