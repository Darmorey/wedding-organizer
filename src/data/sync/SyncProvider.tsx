import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '../../features/auth/AuthProvider'
import { db } from '../db/database'
import { syncProject } from './syncEngine'
import { subscribeToProject, unsubscribeFromProject } from './realtime'

interface SyncContextValue {
  syncing: boolean
  queueCount: number
  lastSyncedAt: string | null
  lastError: string | null
  syncNow: () => Promise<void>
}

const SyncContext = createContext<SyncContextValue | null>(null)

export function SyncProvider({ children }: { children: ReactNode }) {
  const { session, activeProjectId } = useAuth()
  const [syncing, setSyncing] = useState(false)
  const [queueCount, setQueueCount] = useState(0)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)

  const refreshQueueCount = useCallback(async () => {
    if (!activeProjectId) {
      setQueueCount(0)
      return
    }
    const count = await db.syncQueue.where('projectId').equals(activeProjectId).count()
    setQueueCount(count)
  }, [activeProjectId])

  const syncNow = useCallback(async () => {
    if (!session || !activeProjectId || syncing) return

    setSyncing(true)
    setLastError(null)

    try {
      await syncProject(activeProjectId)
      setLastSyncedAt(new Date().toISOString())
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'Sync failed')
    } finally {
      setSyncing(false)
      await refreshQueueCount()
    }
  }, [session, activeProjectId, syncing, refreshQueueCount])

  useEffect(() => {
    refreshQueueCount()
  }, [refreshQueueCount])

  useEffect(() => {
    if (!session || !activeProjectId) return

    syncNow().catch(console.error)

    const channel = subscribeToProject(activeProjectId, () => {
      refreshQueueCount().catch(console.error)
    })

    const onOnline = () => {
      syncNow().catch(console.error)
    }

    window.addEventListener('online', onOnline)

    return () => {
      window.removeEventListener('online', onOnline)
      unsubscribeFromProject(channel)
    }
  }, [session, activeProjectId]) // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(
    () => ({
      syncing,
      queueCount,
      lastSyncedAt,
      lastError,
      syncNow,
    }),
    [syncing, queueCount, lastSyncedAt, lastError, syncNow],
  )

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useSync() {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync must be used within SyncProvider')
  return ctx
}
