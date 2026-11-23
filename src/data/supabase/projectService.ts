import { supabase } from '../supabase/client'
import type { WeddingProject } from '../../core/types/entity'
import { purgeProjectLocalData } from '../local/purgeProjectLocalData'
import { seedProjectCategories } from '../repositories/seedService'
import { syncProject } from '../sync/syncEngine'

function mapProject(row: {
  id: string
  name: string
  invite_code: string
  owner_id: string
  created_at: string
  updated_at: string
}): WeddingProject {
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function fetchUserProjects(): Promise<WeddingProject[]> {
  const { data, error } = await supabase
    .from('wedding_projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(mapProject)
}

export async function createWeddingProject(name: string): Promise<WeddingProject> {
  const { data, error } = await supabase.rpc('create_wedding_project', {
    p_name: name,
  })

  if (error) throw error

  const row = data?.[0]
  if (!row) throw new Error('Project was not created')

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const now = new Date().toISOString()
  return {
    id: row.project_id,
    name: name.trim(),
    inviteCode: row.invite_code,
    ownerId: user.id,
    createdAt: now,
    updatedAt: now,
  }
}

export async function bootstrapNewProject(name: string): Promise<WeddingProject> {
  const project = await createWeddingProject(name)
  await seedProjectCategories(project.id)
  await syncProject(project.id)
  return project
}

export async function renameWeddingProject(projectId: string, name: string): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Введите название проекта')

  const { data, error } = await supabase
    .from('wedding_projects')
    .update({ name: trimmed })
    .eq('id', projectId)
    .select('id')

  if (error) throw error
  if (!data?.length) {
    throw new Error('Не удалось переименовать. Переименовывать может только владелец проекта.')
  }
}

export async function joinWeddingProject(inviteCode: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_project', {
    p_invite_code: inviteCode.trim().toUpperCase(),
  })

  if (error) throw error
  return data as string
}

export async function deleteWeddingProject(projectId: string): Promise<void> {
  const { error: rpcError } = await supabase.rpc('delete_wedding_project', {
    p_project_id: projectId,
  })

  if (!rpcError) {
    await purgeProjectLocalData(projectId)
    return
  }

  const missingRpc =
    rpcError.code === 'PGRST202' ||
    rpcError.message.includes('Could not find the function')

  if (missingRpc) {
    const { data, error } = await supabase
      .from('wedding_projects')
      .delete()
      .eq('id', projectId)
      .select('id')

    if (error) throw error
    if (!data?.length) {
      throw new Error(
        'Удаление заблокировано. Выполните в Supabase SQL Editor файл supabase/migrations/007_delete_wedding_project_rpc.sql (или 006_project_owner_delete.sql).',
      )
    }
    await purgeProjectLocalData(projectId)
    return
  }

  throw rpcError
}

export async function getProjectById(projectId: string): Promise<WeddingProject | null> {
  const { data, error } = await supabase
    .from('wedding_projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle()

  if (error) throw error
  return data ? mapProject(data) : null
}
