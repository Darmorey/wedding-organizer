import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../supabase/client'
import { mapCategoryFromRow, mapTaskFromRow, type CategoryRow, type TaskRow } from '../supabase/mappers'
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
    .subscribe()

  return channel
}

export function unsubscribeFromProject(channel: RealtimeChannel): void {
  supabase.removeChannel(channel)
}
