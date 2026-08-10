import type { Task } from '../../core/types/entity'
import { createId, nowIso } from '../../core/utils/id'
import { db } from '../db/database'
import { assertProjectId, enqueueSync } from './baseRepository'

export const taskRepository = {
  async listByCategory(projectId: string, categoryId: string): Promise<Task[]> {
    assertProjectId(projectId)
    const rows = await db.tasks
      .where('[projectId+categoryId]')
      .equals([projectId, categoryId])
      .toArray()

    return rows.filter((row) => !row.deletedAt).sort((a, b) => a.sortOrder - b.sortOrder)
  },

  async create(projectId: string, categoryId: string, title: string): Promise<Task> {
    assertProjectId(projectId)

    const existing = await this.listByCategory(projectId, categoryId)
    const now = nowIso()

    const task: Task = {
      id: createId(),
      projectId,
      categoryId,
      title: title.trim(),
      done: false,
      sortOrder: existing.length,
      metadata: {},
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }

    await db.tasks.put(task)
    await enqueueSync(projectId, 'tasks', task.id, 'upsert')
    return task
  },

  async toggleDone(projectId: string, taskId: string): Promise<Task> {
    assertProjectId(projectId)
    const task = await db.tasks.get(taskId)
    if (!task || task.projectId !== projectId || task.deletedAt) {
      throw new Error('Task not found')
    }

    const updated: Task = {
      ...task,
      done: !task.done,
      updatedAt: nowIso(),
    }

    await db.tasks.put(updated)
    await enqueueSync(projectId, 'tasks', taskId, 'upsert')
    return updated
  },

  async remove(projectId: string, taskId: string): Promise<void> {
    assertProjectId(projectId)
    const task = await db.tasks.get(taskId)
    if (!task || task.projectId !== projectId || task.deletedAt) return

    const updated: Task = {
      ...task,
      updatedAt: nowIso(),
      deletedAt: nowIso(),
    }

    await db.tasks.put(updated)
    await enqueueSync(projectId, 'tasks', taskId, 'upsert')
  },
}

export async function getTaskStats(projectId: string): Promise<{ total: number; done: number }> {
  assertProjectId(projectId)
  const tasks = await db.tasks.where('projectId').equals(projectId).toArray()
  const active = tasks.filter((task) => !task.deletedAt)
  return {
    total: active.length,
    done: active.filter((task) => task.done).length,
  }
}

export async function getCategoryTaskStats(
  projectId: string,
  categoryId: string,
): Promise<{ total: number; done: number }> {
  const tasks = await taskRepository.listByCategory(projectId, categoryId)
  return {
    total: tasks.length,
    done: tasks.filter((task) => task.done).length,
  }
}
