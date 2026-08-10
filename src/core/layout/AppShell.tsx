import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthProvider'
import { useSync } from '../../data/sync/SyncProvider'
import { MAIN_NAV } from '../registry/navigation'

export function AppShell() {
  const { activeProject } = useAuth()
  const { syncing, queueCount } = useSync()

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
      <header className="sticky top-0 z-10 border-b border-cream-dark bg-cream/95 px-6 py-4 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-accent">
              Свадебный организатор
            </p>
            <h1 className="text-lg font-semibold text-accent-dark">
              {activeProject?.name ?? 'Проект'}
            </h1>
          </div>
          <div className="text-right text-xs text-muted">
            {syncing ? (
              <span>Синхронизация…</span>
            ) : queueCount > 0 ? (
              <span>Офлайн · {queueCount} в очереди</span>
            ) : (
              <span>Синхронизировано</span>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-6">
        <Outlet />
      </main>

      <nav className="sticky bottom-0 border-t border-cream-dark bg-white px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <ul className="flex justify-around">
          {MAIN_NAV.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  [
                    'flex min-w-20 flex-col items-center rounded-xl px-3 py-2 text-xs font-medium transition-colors',
                    isActive ? 'text-accent-dark' : 'text-muted hover:text-ink',
                  ].join(' ')
                }
              >
                <span className="text-lg">{item.icon}</span>
                <span className="mt-0.5">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
