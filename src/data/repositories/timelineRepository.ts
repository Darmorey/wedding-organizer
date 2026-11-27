import type { TimelineEvent } from '../../core/types/entity'
import { TIMELINE_PRESET, compareTimelineTime } from '../../core/config/timeline'
import { createId, nowIso } from '../../core/utils/id'
import { db } from '../db/database'
import { assertProjectId, enqueueSync } from './baseRepository'

function sortEvents(rows: TimelineEvent[]) {
  return [...rows].sort(
    (a, b) => compareTimelineTime(a.startTime, b.startTime) || a.sortOrder - b.sortOrder,
  )
}

export const timelineRepository = {
  async listByProject(projectId: string): Promise<TimelineEvent[]> {
    assertProjectId(projectId)
    const rows = await db.timelineEvents.where('projectId').equals(projectId).toArray()
    return sortEvents(rows.filter((row) => !row.deletedAt))
  },

  async create(
    projectId: string,
    input: { title: string; startTime: string; endTime: string; note: string },
  ): Promise<TimelineEvent> {
    assertProjectId(projectId)
    const existing = await this.listByProject(projectId)
    const now = nowIso()
    const event: TimelineEvent = {
      id: createId(),
      projectId,
      title: input.title.trim(),
      startTime: input.startTime,
      endTime: input.endTime,
      note: input.note.trim(),
      sortOrder: existing.length,
      metadata: {},
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
    await db.timelineEvents.put(event)
    await enqueueSync(projectId, 'timeline_events', event.id, 'upsert')
    return event
  },

  async update(
    projectId: string,
    eventId: string,
    input: { title: string; startTime: string; endTime: string; note: string },
  ): Promise<void> {
    assertProjectId(projectId)
    const event = await db.timelineEvents.get(eventId)
    if (!event || event.projectId !== projectId || event.deletedAt) return
    const updated: TimelineEvent = {
      ...event,
      title: input.title.trim(),
      startTime: input.startTime,
      endTime: input.endTime,
      note: input.note.trim(),
      updatedAt: nowIso(),
    }
    await db.timelineEvents.put(updated)
    await enqueueSync(projectId, 'timeline_events', eventId, 'upsert')
  },

  async remove(projectId: string, eventId: string): Promise<void> {
    assertProjectId(projectId)
    const event = await db.timelineEvents.get(eventId)
    if (!event || event.projectId !== projectId || event.deletedAt) return
    await db.timelineEvents.put({
      ...event,
      updatedAt: nowIso(),
      deletedAt: nowIso(),
    })
    await enqueueSync(projectId, 'timeline_events', eventId, 'upsert')
  },

  async seedPreset(projectId: string): Promise<void> {
    assertProjectId(projectId)
    const existing = await this.listByProject(projectId)
    if (existing.length > 0) return
    for (const item of TIMELINE_PRESET) {
      await this.create(projectId, item)
    }
  },
}
