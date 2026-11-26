import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthProvider'
import { useSync } from '../../data/sync/SyncProvider'
import { MAIN_NAV } from '../registry/navigation'
import { AppHeaderMenu } from './AppHeaderMenu'

export function AppShell() {
  const { activeProject } = useAuth()
  const { syncing, queueCount } = useSync()

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
      <header className="sticky top-0 z-20 overflow-visible border-b border-cream-dark/80 bg-surface px-4 py-1.5">
        <div className="relative flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-label text-[10px] font-medium uppercase tracking-wide text-coral">
              Свадебный организатор
            </p>
            <div className="flex min-w-0 items-center gap-0.5">
              <h1 className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight text-ink">
                {activeProject?.name ?? 'Проект'}
              </h1>
              <AppHeaderMenu />
            </div>
          </div>
          <div className="shrink-0 text-right text-[10px] leading-none text-muted">
            {syncing ? (
              <span>Синхронизация…</span>
            ) : queueCount > 0 ? (
              <span>Офлайн · {queueCount}</span>
            ) : (
              <span>Синхр.</span>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-3">
        <Outlet />
      </main>

      <nav className="sticky bottom-0 border-t border-cream-dark/80 bg-surface/95 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md">
        <ul className="flex justify-around">
          {MAIN_NAV.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  [
                    'flex min-w-20 flex-col items-center rounded-full px-3 py-2 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-muted hover:bg-white/70 hover:text-ink',
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
