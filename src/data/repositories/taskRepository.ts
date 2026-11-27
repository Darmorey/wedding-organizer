import type { Task } from '../../core/types/entity'
import { type DeadlinePhase } from '../../core/config/deadlines'
import { createId, nowIso } from '../../core/utils/id'
import { taskParentId } from '../../core/utils/taskTree'
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

  async create(
    projectId: string,
    categoryId: string,
    title: string,
    deadlinePhase: DeadlinePhase,
    parentId?: string,
  ): Promise<Task> {
    assertProjectId(projectId)

    const existing = await this.listByCategory(projectId, categoryId)
    const siblings = parentId
      ? existing.filter((task) => taskParentId(task) === parentId)
      : existing.filter((task) => !taskParentId(task))
    const now = nowIso()

    const task: Task = {
      id: createId(),
      projectId,
      categoryId,
      title: title.trim(),
      done: false,
      sortOrder: siblings.length,
      metadata: parentId ? { deadlinePhase, parentId } : { deadlinePhase },
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }

    await db.tasks.put(task)
    await enqueueSync(projectId, 'tasks', task.id, 'upsert')
    return task
  },

  async updateTitle(projectId: string, taskId: string, title: string): Promise<Task> {
    assertProjectId(projectId)
    const trimmed = title.trim()
    if (!trimmed) throw new Error('Task title is required')

    const task = await db.tasks.get(taskId)
    if (!task || task.projectId !== projectId || task.deletedAt) {
      throw new Error('Task not found')
    }

    const updated: Task = {
      ...task,
      title: trimmed,
      updatedAt: nowIso(),
    }

    await db.tasks.put(updated)
    await enqueueSync(projectId, 'tasks', taskId, 'upsert')
    return updated
  },

  async updateDeadline(projectId: string, taskId: string, deadlinePhase: DeadlinePhase): Promise<Task> {
    assertProjectId(projectId)
    const task = await db.tasks.get(taskId)
    if (!task || task.projectId !== projectId || task.deletedAt) {
      throw new Error('Task not found')
    }

    const updated: Task = {
      ...task,
      metadata: { ...(task.metadata ?? {}), deadlinePhase },
      updatedAt: nowIso(),
    }

    await db.tasks.put(updated)
    await enqueueSync(projectId, 'tasks', taskId, 'upsert')
    return updated
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

  async reorder(projectId: string, categoryId: string, orderedIds: string[], parentId?: string): Promise<void> {
    assertProjectId(projectId)
    const tasks = await this.listByCategory(projectId, categoryId)
    const group = tasks.filter((task) => taskParentId(task) === (parentId ?? null))
    const byId = new Map(group.map((task) => [task.id, task]))
    const reordered = orderedIds.map((id) => byId.get(id)).filter((task): task is Task => Boolean(task))
    if (reordered.length !== group.length) return

    const now = nowIso()
    const changedIds: string[] = []

    await db.transaction('rw', db.tasks, async () => {
      for (let sortOrder = 0; sortOrder < reordered.length; sortOrder++) {
        const task = reordered[sortOrder]
        if (task.sortOrder === sortOrder) continue
        await db.tasks.put({ ...task, sortOrder, updatedAt: now })
        changedIds.push(task.id)
      }
    })

    for (const id of changedIds) {
      await enqueueSync(projectId, 'tasks', id, 'upsert')
    }
  },

  async remove(projectId: string, taskId: string): Promise<void> {
    assertProjectId(projectId)
    const task = await db.tasks.get(taskId)
    if (!task || task.projectId !== projectId || task.deletedAt) return

    const siblings = await this.listByCategory(projectId, task.categoryId)
    const toRemove = [task, ...siblings.filter((entry) => taskParentId(entry) === taskId)]
    const now = nowIso()

    await db.transaction('rw', db.tasks, async () => {
      for (const entry of toRemove) {
        await db.tasks.put({ ...entry, updatedAt: now, deletedAt: now })
      }
    })
    for (const entry of toRemove) {
      await enqueueSync(projectId, 'tasks', entry.id, 'upsert')
    }
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
