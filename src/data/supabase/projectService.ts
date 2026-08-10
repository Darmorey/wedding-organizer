import { supabase } from '../supabase/client'
import type { WeddingProject } from '../../core/types/entity'

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

export async function joinWeddingProject(inviteCode: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_project', {
    p_invite_code: inviteCode.trim().toUpperCase(),
  })

  if (error) throw error
  return data as string
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
