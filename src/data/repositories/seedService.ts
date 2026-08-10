import type { Category } from '../../core/types/entity'
import { createId, nowIso } from '../../core/utils/id'
import { CATEGORY_TEMPLATES } from '../../core/config/templates'
import { db } from '../db/database'
import { enqueueSync } from './baseRepository'

export async function seedProjectCategories(projectId: string): Promise<void> {
  const existing = await db.categories.where('projectId').equals(projectId).count()
  if (existing > 0) return

  const now = nowIso()
  const categories: Category[] = []
  const tasks = CATEGORY_TEMPLATES.flatMap((template, categoryIndex) => {
    const categoryId = createId()
    categories.push({
      id: categoryId,
      projectId,
      name: template.name,
      icon: template.icon,
      sortOrder: categoryIndex,
      metadata: {},
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })

    return template.tasks.map((title, taskIndex) => ({
      id: createId(),
      projectId,
      categoryId,
      title,
      done: false,
      sortOrder: taskIndex,
      metadata: {},
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }))
  })

  await db.transaction('rw', db.categories, db.tasks, db.syncQueue, async () => {
    await db.categories.bulkPut(categories)
    await db.tasks.bulkPut(tasks)

    for (const category of categories) {
      await enqueueSync(projectId, 'categories', category.id, 'upsert')
    }
    for (const task of tasks) {
      await enqueueSync(projectId, 'tasks', task.id, 'upsert')
    }
  })
}
