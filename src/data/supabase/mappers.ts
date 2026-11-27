import { defaultTextStyle, hydrateMoodItem, readCanvasLayout, withCanvasMetadata } from '../../core/config/moodCanvas'
import type { Category, Guest, MoodItem, MoodKind, Task, TimelineEvent, UploadStatus } from '../../core/types/entity'

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

export interface MoodItemRow {
  id: string
  project_id: string
  category_id: string
  kind: Exclude<MoodKind, 'note'>
  caption: string
  url: string
  storage_path: string
  file_name: string
  mime_type: string
  size_bytes: number
  upload_status: UploadStatus
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  deleted_at: string | null
}

function moodSortOrderFromMetadata(metadata: Record<string, unknown> | undefined, createdAt: string): number {
  const value = metadata?.sortOrder
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const created = Date.parse(createdAt)
  return Number.isFinite(created) ? -created : 0
}

export function mapMoodItemFromRow(row: MoodItemRow): MoodItem {
  const metadata = row.metadata ?? {}
  return hydrateMoodItem({
    id: row.id,
    projectId: row.project_id,
    categoryId: row.category_id,
    kind: row.kind,
    caption: row.caption,
    url: row.url,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes ?? 0),
    uploadStatus: row.upload_status,
    sortOrder: moodSortOrderFromMetadata(metadata, row.created_at),
    canvas: readCanvasLayout(metadata, 0),
    textStyle: defaultTextStyle(),
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  })
}

export function mapMoodItemToRow(item: MoodItem): MoodItemRow {
  return {
    id: item.id,
    project_id: item.projectId,
    category_id: item.categoryId,
    kind: item.kind === 'image' ? 'image' : 'link',
    caption: item.caption,
    url: item.url,
    storage_path: item.storagePath,
    file_name: item.fileName,
    mime_type: item.mimeType,
    size_bytes: item.sizeBytes,
    upload_status: item.uploadStatus,
    metadata: withCanvasMetadata(item),
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    deleted_at: item.deletedAt ?? null,
  }
}

export interface TimelineEventRow {
  id: string
  project_id: string
  title: string
  start_time: string
  end_time: string
  note: string
  sort_order: number
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export function mapTimelineEventFromRow(row: TimelineEventRow): TimelineEvent {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    startTime: row.start_time ?? '',
    endTime: row.end_time ?? '',
    note: row.note ?? '',
    sortOrder: row.sort_order ?? 0,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }
}

export function mapTimelineEventToRow(event: TimelineEvent): TimelineEventRow {
  return {
    id: event.id,
    project_id: event.projectId,
    title: event.title,
    start_time: event.startTime,
    end_time: event.endTime,
    note: event.note,
    sort_order: event.sortOrder,
    metadata: event.metadata ?? {},
    created_at: event.createdAt,
    updated_at: event.updatedAt,
    deleted_at: event.deletedAt ?? null,
  }
}
