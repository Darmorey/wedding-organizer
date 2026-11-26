import Dexie, { type EntityTable } from 'dexie'
import type { Category, Guest, MoodItem, SyncQueueItem, Task } from '../../core/types/entity'

export class WeddingDatabase extends Dexie {
  categories!: EntityTable<Category, 'id'>
  tasks!: EntityTable<Task, 'id'>
  guests!: EntityTable<Guest, 'id'>
  moodItems!: EntityTable<MoodItem, 'id'>
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

    this.version(3).stores({
      categories: 'id, projectId, [projectId+sortOrder], updatedAt',
      tasks:
        'id, projectId, categoryId, [projectId+categoryId], [projectId+categoryId+sortOrder], updatedAt',
      guests: 'id, projectId, rsvp, [projectId+rsvp], updatedAt',
      moodItems: 'id, projectId, categoryId, [projectId+categoryId], updatedAt',
      syncQueue: 'id, projectId, entityId, [projectId+entityId]',
    })

    this.version(4)
      .stores({
        categories: 'id, projectId, [projectId+sortOrder], updatedAt',
        tasks:
          'id, projectId, categoryId, [projectId+categoryId], [projectId+categoryId+sortOrder], updatedAt',
        guests: 'id, projectId, rsvp, [projectId+rsvp], updatedAt',
        moodItems: 'id, projectId, categoryId, [projectId+categoryId], updatedAt',
        syncQueue: 'id, projectId, entityId, [projectId+entityId]',
      })
      .upgrade(async (tx) => {
        const table = tx.table('moodItems')
        const rows = await table.toArray()
        const groups = new Map<string, typeof rows>()
        for (const row of rows) {
          const key = `${row.projectId}:${row.categoryId}`
          const list = groups.get(key) ?? []
          list.push(row)
          groups.set(key, list)
        }
        for (const list of groups.values()) {
          list.sort((a, b) => Date.parse(String(b.createdAt)) - Date.parse(String(a.createdAt)))
          for (let i = 0; i < list.length; i++) {
            await table.put({ ...list[i], sortOrder: i })
          }
        }
      })
  }
}

export const db = new WeddingDatabase()
