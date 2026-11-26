import { supabase } from './client'

const BUCKET = 'project-assets'

export function moodStoragePath(projectId: string, itemId: string): string {
  return `${projectId}/mood/${itemId}.webp`
}

export async function uploadMoodImage(path: string, blob: Blob, mimeType: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: mimeType,
    upsert: true,
  })
  if (error) throw error
}

export async function removeMoodImage(path: string): Promise<void> {
  if (!path) return
  await supabase.storage.from(BUCKET).remove([path])
}

export async function signedMoodUrl(path: string): Promise<string | null> {
  if (!path) return null
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}