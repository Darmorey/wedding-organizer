import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  fullWidth?: boolean
}

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-white shadow-sm hover:bg-accent-dark disabled:opacity-50',
  secondary:
    'border border-cream-dark bg-surface text-ink hover:bg-cream-dark/40 disabled:opacity-50',
  ghost: 'text-ink hover:bg-white/60 disabled:opacity-50',
}

export function Button({
  variant = 'primary',
  fullWidth,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'rounded-full px-4 py-2.5 text-sm font-medium transition-colors',
        variants[variant],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )
}
