import { Link } from 'react-router-dom'

interface AuthLayoutProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-cream-dark bg-white p-8 shadow-sm">
        {subtitle ? (
          <p className="mb-2 text-sm font-medium uppercase tracking-wide text-accent">
            {subtitle}
          </p>
        ) : null}
        <h1 className="mb-6 text-2xl font-semibold text-accent-dark">{title}</h1>
        {children}
      </div>
      {footer ? <div className="mt-4 text-center text-sm text-muted">{footer}</div> : null}
    </main>
  )
}

export function AuthLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="font-medium text-accent-dark hover:text-accent">
      {children}
    </Link>
  )
}
