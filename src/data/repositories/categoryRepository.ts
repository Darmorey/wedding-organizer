import type { Category } from '../../core/types/entity'
import { createId, nowIso } from '../../core/utils/id'
import { db } from '../db/database'
import { assertProjectId, enqueueSync } from './baseRepository'

export const categoryRepository = {
  async listByProject(projectId: string): Promise<Category[]> {
    assertProjectId(projectId)
    const rows = await db.categories.where('projectId').equals(projectId).toArray()
    return rows.filter((row) => !row.deletedAt).sort((a, b) => a.sortOrder - b.sortOrder)
  },

  async getById(projectId: string, categoryId: string): Promise<Category | undefined> {
    assertProjectId(projectId)
    const category = await db.categories.get(categoryId)
    if (!category || category.projectId !== projectId || category.deletedAt) {
      return undefined
    }
    return category
  },

  async create(projectId: string, input: Pick<Category, 'name' | 'icon'>): Promise<Category> {
    assertProjectId(projectId)

    const existing = await db.categories.where('projectId').equals(projectId).toArray()
    const active = existing.filter((item) => !item.deletedAt)
    const now = nowIso()

    const category: Category = {
      id: createId(),
      projectId,
      name: input.name.trim(),
      icon: input.icon.trim() || '📋',
      sortOrder: active.length,
      metadata: {},
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }

    await db.categories.put(category)
    await enqueueSync(projectId, 'categories', category.id, 'upsert')
    return category
  },

  async rename(projectId: string, categoryId: string, name: string): Promise<Category> {
    const category = await this.getById(projectId, categoryId)
    if (!category) throw new Error('Category not found')

    const updated: Category = {
      ...category,
      name: name.trim(),
      updatedAt: nowIso(),
    }

    await db.categories.put(updated)
    await enqueueSync(projectId, 'categories', categoryId, 'upsert')
    return updated
  },

  async remove(projectId: string, categoryId: string): Promise<void> {
    const category = await this.getById(projectId, categoryId)
    if (!category) return

    const now = nowIso()
    const deleted: Category = {
      ...category,
      updatedAt: now,
      deletedAt: now,
    }

    await db.transaction('rw', db.categories, db.tasks, db.syncQueue, async () => {
      await db.categories.put(deleted)
      await enqueueSync(projectId, 'categories', categoryId, 'upsert')

      const tasks = await db.tasks
        .where('[projectId+categoryId]')
        .equals([projectId, categoryId])
        .toArray()

      for (const task of tasks) {
        if (task.deletedAt) continue
        const deletedTask = { ...task, updatedAt: now, deletedAt: now }
        await db.tasks.put(deletedTask)
        await enqueueSync(projectId, 'tasks', task.id, 'upsert')
      }
    })
  },
}
