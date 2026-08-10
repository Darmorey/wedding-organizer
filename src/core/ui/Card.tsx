import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  subtitle?: string
  children: ReactNode
}

export function Card({ title, subtitle, children }: CardProps) {
  return (
    <div className="rounded-2xl border border-cream-dark bg-white p-6 shadow-sm">
      {title ? (
        <div className="mb-4">
          {subtitle ? (
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-accent">
              {subtitle}
            </p>
          ) : null}
          <h1 className="text-xl font-semibold text-accent-dark">{title}</h1>
        </div>
      ) : null}
      {children}
    </div>
  )
}
