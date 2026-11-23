import type { Category, Guest, Task } from '../../core/types/entity'

export interface CategoryRow {
  id: string
  project_id: string
  name: string
  icon: string
  sort_order: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface TaskRow {
  id: string
  project_id: string
  category_id: string
  title: string
  done: boolean
  sort_order: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export function mapCategoryFromRow(row: CategoryRow): Category {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    icon: row.icon,
    sortOrder: row.sort_order,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }
}

export function mapCategoryToRow(category: Category): CategoryRow {
  return {
    id: category.id,
    project_id: category.projectId,
    name: category.name,
    icon: category.icon,
    sort_order: category.sortOrder,
    metadata: category.metadata ?? {},
    created_at: category.createdAt,
    updated_at: category.updatedAt,
    deleted_at: category.deletedAt ?? null,
  }
}

export function mapTaskFromRow(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    categoryId: row.category_id,
    title: row.title,
    done: row.done,
    sortOrder: row.sort_order,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }
}

export function mapTaskToRow(task: Task): TaskRow {
  return {
    id: task.id,
    project_id: task.projectId,
    category_id: task.categoryId,
    title: task.title,
    done: task.done,
    sort_order: task.sortOrder,
    metadata: task.metadata ?? {},
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    deleted_at: task.deletedAt ?? null,
  }
}

export interface GuestRow {
  id: string
  project_id: string
  name: string
  guest_group: string
  rsvp: string
  plus_one: boolean
  plus_one_is_child: boolean
  notes: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export function mapGuestFromRow(row: GuestRow): Guest {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    guestGroup: row.guest_group,
    rsvp: row.rsvp as Guest['rsvp'],
    plusOne: row.plus_one,
    plusOneIsChild: row.plus_one_is_child ?? false,
    notes: row.notes,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }
}

export function mapGuestToRow(guest: Guest): GuestRow {
  return {
    id: guest.id,
    project_id: guest.projectId,
    name: guest.name,
    guest_group: guest.guestGroup,
    rsvp: guest.rsvp,
    plus_one: guest.plusOne,
    plus_one_is_child: guest.plusOneIsChild,
    notes: guest.notes,
    metadata: guest.metadata ?? {},
    created_at: guest.createdAt,
    updated_at: guest.updatedAt,
    deleted_at: guest.deletedAt ?? null,
  }
}
