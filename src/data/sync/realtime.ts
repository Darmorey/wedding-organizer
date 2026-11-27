import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../supabase/client'
import {
  mapCategoryFromRow,
  mapGuestFromRow,
  mapMoodItemFromRow,
  mapTaskFromRow,
  mapTimelineEventFromRow,
  type CategoryRow,
  type GuestRow,
  type MoodItemRow,
  type TaskRow,
  type TimelineEventRow,
} from '../supabase/mappers'
import { db } from '../db/database'
import { mergeEntity } from '../repositories/baseRepository'

export function subscribeToProject(
  projectId: string,
  onChange: () => void,
): RealtimeChannel {
  const channel = supabase
    .channel(`project-${projectId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'categories', filter: `project_id=eq.${projectId}` },
      async (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = (payload.old as { id?: string }).id
          if (id) await db.categories.delete(id)
        } else {
          const remote = mapCategoryFromRow(payload.new as CategoryRow)
          const local = await db.categories.get(remote.id)
          await db.categories.put(mergeEntity(local, remote))
        }
        onChange()
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` },
      async (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = (payload.old as { id?: string }).id
          if (id) await db.tasks.delete(id)
        } else {
          const remote = mapTaskFromRow(payload.new as TaskRow)
          const local = await db.tasks.get(remote.id)
          await db.tasks.put(mergeEntity(local, remote))
        }
        onChange()
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'guests', filter: `project_id=eq.${projectId}` },
      async (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = (payload.old as { id?: string }).id
          if (id) await db.guests.delete(id)
        } else {
          const remote = mapGuestFromRow(payload.new as GuestRow)
          const local = await db.guests.get(remote.id)
          await db.guests.put(mergeEntity(local, remote))
        }
        onChange()
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'mood_items', filter: `project_id=eq.${projectId}` },
      async (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = (payload.old as { id?: string }).id
          if (id) await db.moodItems.delete(id)
        } else {
          const remote = mapMoodItemFromRow(payload.new as MoodItemRow)
          const local = await db.moodItems.get(remote.id)
          await db.moodItems.put(mergeEntity(local, remote))
        }
        onChange()
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'timeline_events', filter: `project_id=eq.${projectId}` },
      async (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = (payload.old as { id?: string }).id
          if (id) await db.timelineEvents.delete(id)
        } else {
          const remote = mapTimelineEventFromRow(payload.new as TimelineEventRow)
          const local = await db.timelineEvents.get(remote.id)
          await db.timelineEvents.put(mergeEntity(local, remote))
        }
        onChange()
      },
    )
    .subscribe()

  return channel
}

export function unsubscribeFromProject(channel: RealtimeChannel): void {
  supabase.removeChannel(channel)
}
