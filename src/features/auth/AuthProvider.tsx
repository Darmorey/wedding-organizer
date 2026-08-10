import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../../data/supabase/client'
import type { WeddingProject } from '../../core/types/entity'
import { fetchUserProjects } from '../../data/supabase/projectService'

const ACTIVE_PROJECT_KEY = 'wedding-organizer:active-project'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  projects: WeddingProject[]
  activeProject: WeddingProject | null
  activeProjectId: string | null
  refreshProjects: () => Promise<void>
  setActiveProjectId: (projectId: string) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<WeddingProject[]>([])
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_PROJECT_KEY),
  )

  const refreshProjects = useCallback(async () => {
    if (!session) {
      setProjects([])
      return
    }
    const list = await fetchUserProjects()
    setProjects(list)

    if (list.length === 0) {
      setActiveProjectIdState(null)
      localStorage.removeItem(ACTIVE_PROJECT_KEY)
      return
    }

    const stored = localStorage.getItem(ACTIVE_PROJECT_KEY)
    const valid = list.find((p) => p.id === stored) ?? list[0]
    setActiveProjectIdState(valid.id)
    localStorage.setItem(ACTIVE_PROJECT_KEY, valid.id)
  }, [session])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setProjects([])
      return
    }
    refreshProjects().catch(console.error)
  }, [session, refreshProjects])

  const setActiveProjectId = useCallback((projectId: string) => {
    setActiveProjectIdState(projectId)
    localStorage.setItem(ACTIVE_PROJECT_KEY, projectId)
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    localStorage.removeItem(ACTIVE_PROJECT_KEY)
    setActiveProjectIdState(null)
    setProjects([])
  }, [])

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      loading,
      projects,
      activeProject,
      activeProjectId,
      refreshProjects,
      setActiveProjectId,
      signOut,
    }),
    [
      session,
      user,
      loading,
      projects,
      activeProject,
      activeProjectId,
      refreshProjects,
      setActiveProjectId,
      signOut,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
