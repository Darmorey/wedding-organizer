import { supabase } from '../supabase/client'
import {
  mapCategoryFromRow,
  mapCategoryToRow,
  mapTaskFromRow,
  mapTaskToRow,
  type CategoryRow,
  type TaskRow,
} from '../supabase/mappers'
import { db } from '../db/database'
import { mergeRecords } from './merge'

export async function pullProjectData(projectId: string): Promise<void> {
  const [categoriesResult, tasksResult] = await Promise.all([
    supabase.from('categories').select('*').eq('project_id', projectId),
    supabase.from('tasks').select('*').eq('project_id', projectId),
  ])

  if (categoriesResult.error) throw categoriesResult.error
  if (tasksResult.error) throw tasksResult.error

  const remoteCategories = (categoriesResult.data as CategoryRow[]).map(mapCategoryFromRow)
  const remoteTasks = (tasksResult.data as TaskRow[]).map(mapTaskFromRow)

  const localCategories = await db.categories.where('projectId').equals(projectId).toArray()
  const localTasks = await db.tasks.where('projectId').equals(projectId).toArray()

  const mergedCategories = mergeRecords(localCategories, remoteCategories)
  const mergedTasks = mergeRecords(localTasks, remoteTasks)

  await db.transaction('rw', db.categories, db.tasks, async () => {
    await db.categories.bulkPut(mergedCategories)
    await db.tasks.bulkPut(mergedTasks)
  })
}

export async function pushQueueItem(projectId: string, entityId: string, tableName: 'categories' | 'tasks') {
  if (tableName === 'categories') {
    const category = await db.categories.get(entityId)
    if (!category || category.projectId !== projectId) return

    const { error } = await supabase.from('categories').upsert(mapCategoryToRow(category))
    if (error) throw error
    return
  }

  const task = await db.tasks.get(entityId)
  if (!task || task.projectId !== projectId) return

  const { error } = await supabase.from('tasks').upsert(mapTaskToRow(task))
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

export async function syncProject(projectId: string): Promise<void> {
  await pushProjectQueue(projectId)
  await pullProjectData(projectId)
}
