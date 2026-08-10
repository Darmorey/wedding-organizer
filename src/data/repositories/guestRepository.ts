import type { Guest, RsvpStatus } from '../../core/types/entity'
import { createId, nowIso } from '../../core/utils/id'
import { db } from '../db/database'
import { assertProjectId, enqueueSync } from './baseRepository'

export interface GuestFilters {
  rsvp?: RsvpStatus | 'all'
  group?: string | 'all'
}

export interface GuestStats {
  total: number
  yes: number
  no: number
  pending: number
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

    return rows.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  },

  async getStats(projectId: string): Promise<GuestStats> {
    assertProjectId(projectId)
    const guests = await this.listByProject(projectId)
    return {
      total: guests.length,
      yes: guests.filter((g) => g.rsvp === 'yes').length,
      no: guests.filter((g) => g.rsvp === 'no').length,
      pending: guests.filter((g) => g.rsvp === 'pending').length,
    }
  },

  async create(
    projectId: string,
    input: Pick<Guest, 'name' | 'guestGroup' | 'plusOne' | 'notes'> & { rsvp?: RsvpStatus },
  ): Promise<Guest> {
    assertProjectId(projectId)
    const now = nowIso()

    const guest: Guest = {
      id: createId(),
      projectId,
      name: input.name.trim(),
      guestGroup: input.guestGroup.trim(),
      rsvp: input.rsvp ?? 'pending',
      plusOne: input.plusOne,
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

    const updated: Guest = { ...guest, rsvp, updatedAt: nowIso() }
    await db.guests.put(updated)
    await enqueueSync(projectId, 'guests', guestId, 'upsert')
    return updated
  },

  async update(
    projectId: string,
    guestId: string,
    input: Partial<Pick<Guest, 'name' | 'guestGroup' | 'rsvp' | 'plusOne' | 'notes'>>,
  ): Promise<Guest> {
    assertProjectId(projectId)
    const guest = await db.guests.get(guestId)
    if (!guest || guest.projectId !== projectId || guest.deletedAt) {
      throw new Error('Guest not found')
    }

    const updated: Guest = {
      ...guest,
      ...input,
      name: input.name?.trim() ?? guest.name,
      guestGroup: input.guestGroup?.trim() ?? guest.guestGroup,
      notes: input.notes?.trim() ?? guest.notes,
      updatedAt: nowIso(),
    }

    await db.guests.put(updated)
    await enqueueSync(projectId, 'guests', guestId, 'upsert')
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
