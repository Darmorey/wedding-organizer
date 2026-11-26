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

export type MoodKind = 'image' | 'link' | 'note'

export type MoodTextSize = 's' | 'm' | 'l'
export type MoodTextAlign = 'left' | 'center' | 'right'

export interface MoodTextStyle {
  size: MoodTextSize
  bold: boolean
  italic: boolean
  underline: boolean
  align: MoodTextAlign
  list: boolean
  color: string
  background: string
}

export interface MoodCanvasLayout {
  x: number
  y: number
  width: number
  height: number
  z: number
  rotation: number
  /** 0..1, какая часть фото видна по горизонтали (0 — левый край) */
  imageOffsetX: number
  /** 0..1, какая часть фото видна по вертикали (0 — верх) */
  imageOffsetY: number
  /** 1 = вписать покрытием рамки, больше — сильнее кроп */
  imageZoom: number
  mediaWidth: number
  mediaHeight: number
}

export interface MoodItem extends BaseEntity {
  categoryId: string
  kind: MoodKind
  caption: string
  url: string
  storagePath: string
  fileName: string
  mimeType: string
  sizeBytes: number
  uploadStatus: UploadStatus
  sortOrder: number
  canvas: MoodCanvasLayout
  textStyle: MoodTextStyle
}

export type SyncTable = 'categories' | 'tasks' | 'guests' | 'mood_items'

export type SyncOperation = 'upsert' | 'delete'

export interface SyncQueueItem {
  id: string
  projectId: string
  tableName: SyncTable
  entityId: string
  operation: SyncOperation
  createdAt: string
}
