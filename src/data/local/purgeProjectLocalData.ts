import { db } from '../db/database'

const GUEST_PREFS_PREFIXES = [
  'wedding-organizer:guest-custom-groups:',
  'wedding-organizer:guest-custom-rsvp:',
  'wedding-organizer:guest-hidden-builtin-groups:',
] as const

export async function purgeProjectLocalData(projectId: string): Promise<void> {
  await db.transaction('rw', db.categories, db.tasks, db.guests, db.syncQueue, async () => {
    await db.categories.where('projectId').equals(projectId).delete()
    await db.tasks.where('projectId').equals(projectId).delete()
    await db.guests.where('projectId').equals(projectId).delete()
    await db.syncQueue.where('projectId').equals(projectId).delete()
  })

  for (const prefix of GUEST_PREFS_PREFIXES) {
    localStorage.removeItem(`${prefix}${projectId}`)
  }
}