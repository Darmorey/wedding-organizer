import type { MemberRole } from '../../core/types/entity'

export interface WeddingProjectRow {
  id: string
  name: string
  invite_code: string
  owner_id: string
  created_at: string
  updated_at: string
}

export interface ProjectMemberRow {
  project_id: string
  user_id: string
  role: MemberRole
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      wedding_projects: {
        Row: WeddingProjectRow
        Insert: Partial<WeddingProjectRow> & Pick<WeddingProjectRow, 'name' | 'invite_code' | 'owner_id'>
        Update: Partial<WeddingProjectRow>
      }
      project_members: {
        Row: ProjectMemberRow
        Insert: Pick<ProjectMemberRow, 'project_id' | 'user_id'> & Partial<Pick<ProjectMemberRow, 'role'>>
        Update: Partial<ProjectMemberRow>
      }
    }
    Functions: {
      create_wedding_project: {
        Args: { p_name: string }
        Returns: { project_id: string; invite_code: string }[]
      }
      join_project: {
        Args: { p_invite_code: string }
        Returns: string
      }
    }
  }
}
