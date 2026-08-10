import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  fullWidth?: boolean
}

const variants: Record<Variant, string> = {
  primary:
    'bg-accent-dark text-white hover:bg-accent disabled:opacity-50',
  secondary:
    'border border-cream-dark bg-white text-ink hover:bg-cream-dark/30 disabled:opacity-50',
  ghost: 'text-accent-dark hover:bg-cream-dark/40 disabled:opacity-50',
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
        'rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
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
