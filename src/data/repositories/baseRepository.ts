import { createId, nowIso } from '../../core/utils/id'
import type { BaseEntity, SyncOperation, SyncQueueItem, SyncTable } from '../../core/types/entity'
import { db } from '../db/database'

export function assertProjectId(projectId: string): void {
  if (!projectId) {
    throw new Error('projectId is required')
  }
}

export async function enqueueSync(
  projectId: string,
  tableName: SyncTable,
  entityId: string,
  operation: SyncOperation,
): Promise<void> {
  const existing = await db.syncQueue
    .where('[projectId+entityId]')
    .equals([projectId, entityId])
    .first()

  const item: SyncQueueItem = {
    id: existing?.id ?? createId(),
    projectId,
    tableName,
    entityId,
    operation,
    createdAt: nowIso(),
  }

  await db.syncQueue.put(item)
}

export function mergeEntity<T extends BaseEntity>(local: T | undefined, remote: T): T {
  if (!local) return remote

  const localUpdated = Date.parse(local.updatedAt)
  const remoteUpdated = Date.parse(remote.updatedAt)

  if (remote.deletedAt && (!local.deletedAt || remoteUpdated >= localUpdated)) {
    return remote
  }

  if (localUpdated > remoteUpdated) {
    return local
  }

  return remote
}

export async function putEntity<T extends BaseEntity>(
  table: 'categories' | 'tasks',
  entity: T,
  enqueue = false,
): Promise<void> {
  if (table === 'categories') {
    await db.categories.put(entity as never)
    if (enqueue) {
      await enqueueSync(entity.projectId, 'categories', entity.id, 'upsert')
    }
    return
  }

  await db.tasks.put(entity as never)
  if (enqueue) {
    await enqueueSync(entity.projectId, 'tasks', entity.id, 'upsert')
  }
}
