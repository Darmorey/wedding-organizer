import type { Task } from '../types/entity'

export function taskParentId(task: { metadata?: Record<string, unknown> }): string | null {
  const value = task.metadata?.parentId
  return typeof value === 'string' && value ? value : null
}

export function isSubtask(task: { metadata?: Record<string, unknown> }) {
  return Boolean(taskParentId(task))
}

export function groupTasks(tasks: Task[]) {
  const ids = new Set(tasks.map((task) => task.id))
  const roots: Task[] = []
  const childrenByParent = new Map<string, Task[]>()
  for (const task of tasks) {
    const parentId = taskParentId(task)
    if (!parentId || !ids.has(parentId)) {
      roots.push(task)
      continue
    }
    const list = childrenByParent.get(parentId) ?? []
    list.push(task)
    childrenByParent.set(parentId, list)
  }
  for (const list of childrenByParent.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder)
  }
  return { roots, childrenByParent }
}
