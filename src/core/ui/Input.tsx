import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  suffix?: string
}

export function Input({ label, error, suffix, id, className = '', ...props }: InputProps) {
  const inputId = id ?? props.name

  return (
    <label htmlFor={inputId} className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <span className="relative block">
        <input
          id={inputId}
          className={[
            'w-full rounded-xl border border-cream-dark bg-white px-3 py-2.5 text-ink',
            'placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20',
            suffix ? 'pr-12' : '',
            error ? 'border-red-400' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">
            {suffix}
          </span>
        ) : null}
      </span>
      {error ? <span className="mt-1 block text-sm text-red-600">{error}</span> : null}
    </label>
  )
}
