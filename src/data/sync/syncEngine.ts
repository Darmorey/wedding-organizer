import { supabase } from '../supabase/client'
import {
  mapCategoryFromRow,
  mapCategoryToRow,
  mapGuestFromRow,
  mapGuestToRow,
  mapMoodItemFromRow,
  mapMoodItemToRow,
  mapTaskFromRow,
  mapTaskToRow,
  type CategoryRow,
  type GuestRow,
  type MoodItemRow,
  type TaskRow,
} from '../supabase/mappers'
import type { SyncTable } from '../../core/types/entity'
import { db } from '../db/database'
import { mergeRecords } from './merge'

export async function pullProjectData(projectId: string): Promise<void> {
  const [categoriesResult, tasksResult, guestsResult, moodResult] = await Promise.all([
    supabase.from('categories').select('*').eq('project_id', projectId),
    supabase.from('tasks').select('*').eq('project_id', projectId),
    supabase.from('guests').select('*').eq('project_id', projectId),
    supabase.from('mood_items').select('*').eq('project_id', projectId),
  ])

  if (categoriesResult.error) throw categoriesResult.error
  if (tasksResult.error) throw tasksResult.error
  if (guestsResult.error) throw guestsResult.error
  if (moodResult.error && !isMissingTableError(moodResult.error.message)) {
    throw moodResult.error
  }

  const remoteCategories = (categoriesResult.data as CategoryRow[]).map(mapCategoryFromRow)
  const remoteTasks = (tasksResult.data as TaskRow[]).map(mapTaskFromRow)
  const remoteGuests = (guestsResult.data as GuestRow[]).map(mapGuestFromRow)
  const remoteMood = moodResult.error
    ? []
    : (moodResult.data as MoodItemRow[]).map(mapMoodItemFromRow)

  const localCategories = await db.categories.where('projectId').equals(projectId).toArray()
  const localTasks = await db.tasks.where('projectId').equals(projectId).toArray()
  const localGuests = await db.guests.where('projectId').equals(projectId).toArray()
  const localMood = await db.moodItems.where('projectId').equals(projectId).toArray()

  const mergedCategories = mergeRecords(localCategories, remoteCategories)
  const mergedTasks = mergeRecords(localTasks, remoteTasks)
  const mergedGuests = mergeRecords(localGuests, remoteGuests)
  const mergedMood = mergeRecords(localMood, remoteMood)

  await db.transaction('rw', db.categories, db.tasks, db.guests, db.moodItems, async () => {
    await db.categories.bulkPut(mergedCategories)
    await db.tasks.bulkPut(mergedTasks)
    await db.guests.bulkPut(mergedGuests)
    await db.moodItems.bulkPut(mergedMood)
  })
}

export async function pushQueueItem(
  projectId: string,
  entityId: string,
  tableName: SyncTable,
): Promise<void> {
  if (tableName === 'categories') {
    const category = await db.categories.get(entityId)
    if (!category || category.projectId !== projectId) return

    const { error } = await supabase.from('categories').upsert(mapCategoryToRow(category))
    if (error) throw error
    return
  }

  if (tableName === 'tasks') {
    const task = await db.tasks.get(entityId)
    if (!task || task.projectId !== projectId) return

    const { error } = await supabase.from('tasks').upsert(mapTaskToRow(task))
    if (error) throw error
    return
  }

  if (tableName === 'mood_items') {
    const item = await db.moodItems.get(entityId)
    if (!item || item.projectId !== projectId) return

    const { error } = await supabase.from('mood_items').upsert(mapMoodItemToRow(item))
    if (error) throw error
    return
  }

  const guest = await db.guests.get(entityId)
  if (!guest || guest.projectId !== projectId) return

  const { error } = await supabase.from('guests').upsert(mapGuestToRow(guest))
  if (error) throw error
}

export async function pushProjectQueue(projectId: string): Promise<number> {
  const queue = await db.syncQueue.where('projectId').equals(projectId).sortBy('createdAt')
  let processed = 0

  for (const item of queue) {
    await pushQueueItem(projectId, item.entityId, item.tableName)
    await db.syncQueue.delete(item.id)
    processed += 1
  }

  return processed
}

function isMissingTableError(message: string): boolean {
  return (
    message.includes('mood_items') &&
    (message.includes('does not exist') || message.includes('schema cache') || message.includes('PGRST'))
  )
}

export async function syncProject(projectId: string): Promise<void> {
  await pushProjectQueue(projectId)
  await pullProjectData(projectId)
}
