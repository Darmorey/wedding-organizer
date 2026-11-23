export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface BaseEntity {
  id: string
  projectId: string
  createdAt: string
  updatedAt: string
  metadata?: Record<string, unknown>
  deletedAt?: string | null
}

export type MemberRole = 'owner' | 'editor'
export type BuiltinRsvpStatus = 'pending' | 'yes' | 'no' | 'not_invited'
/** Встроенные статусы или свой: `custom:…` */
export type RsvpStatus = BuiltinRsvpStatus | `custom:${string}`
export type UploadStatus = 'pending' | 'uploaded' | 'failed'

export interface WeddingProject {
  id: string
  name: string
  inviteCode: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

export interface ProjectMember {
  projectId: string
  userId: string
  role: MemberRole
  createdAt: string
}

export interface Category extends BaseEntity {
  name: string
  icon: string
  sortOrder: number
}

export interface Task extends BaseEntity {
  categoryId: string
  title: string
  done: boolean
  sortOrder: number
}

export interface Guest extends BaseEntity {
  name: string
  guestGroup: string
  rsvp: RsvpStatus
  plusOne: boolean
  /** Имеет смысл только при plusOne: спутник — ребёнок */
  plusOneIsChild: boolean
  notes: string
}

export type SyncTable = 'categories' | 'tasks' | 'guests'

export type SyncOperation = 'upsert' | 'delete'

export interface SyncQueueItem {
  id: string
  projectId: string
  tableName: SyncTable
  entityId: string
  operation: SyncOperation
  createdAt: string
}
