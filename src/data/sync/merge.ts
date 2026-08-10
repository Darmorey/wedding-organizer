import type { BaseEntity } from '../../core/types/entity'
import { mergeEntity } from '../repositories/baseRepository'

export function mergeRecords<T extends BaseEntity>(
  localItems: T[],
  remoteItems: T[],
): T[] {
  const byId = new Map<string, T>()

  for (const local of localItems) {
    byId.set(local.id, local)
  }

  for (const remote of remoteItems) {
    const local = byId.get(remote.id)
    byId.set(remote.id, mergeEntity(local, remote))
  }

  return [...byId.values()]
}
