import Dexie, { type EntityTable } from 'dexie'
import type { Category, Guest, SyncQueueItem, Task } from '../../core/types/entity'

export class WeddingDatabase extends Dexie {
  categories!: EntityTable<Category, 'id'>
  tasks!: EntityTable<Task, 'id'>
  guests!: EntityTable<Guest, 'id'>
  syncQueue!: EntityTable<SyncQueueItem, 'id'>

  constructor() {
    super('wedding-organizer')

    this.version(1).stores({
      categories: 'id, projectId, [projectId+sortOrder], updatedAt',
      tasks:
        'id, projectId, categoryId, [projectId+categoryId], [projectId+categoryId+sortOrder], updatedAt',
      syncQueue: 'id, projectId, entityId, [projectId+entityId]',
    })

    this.version(2).stores({
      categories: 'id, projectId, [projectId+sortOrder], updatedAt',
      tasks:
        'id, projectId, categoryId, [projectId+categoryId], [projectId+categoryId+sortOrder], updatedAt',
      guests: 'id, projectId, rsvp, [projectId+rsvp], updatedAt',
      syncQueue: 'id, projectId, entityId, [projectId+entityId]',
    })
  }
}

export const db = new WeddingDatabase()
