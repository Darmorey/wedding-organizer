import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  subtitle?: string
  children: ReactNode
  className?: string
}

export function Card({ title, subtitle, children, className = '' }: CardProps) {
  return (
    <div
      className={['rounded-2xl border border-cream-dark bg-surface p-6 shadow-sm', className]
        .filter(Boolean)
        .join(' ')}
    >
      {title ? (
        <div className="mb-4">
          {subtitle ? (
            <p className="font-label mb-1 text-xs font-medium uppercase tracking-wide text-coral">
              {subtitle}
            </p>
          ) : null}
          <h1 className="text-xl font-semibold text-ink">{title}</h1>
        </div>
      ) : null}
      {children}
    </div>
  )
}
