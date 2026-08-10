interface ProgressBarProps {
  value: number
  className?: string
}

export function ProgressBar({ value, className = '' }: ProgressBarProps) {
  const percent = Math.max(0, Math.min(100, value))

  return (
    <div className={['h-2 overflow-hidden rounded-full bg-cream-dark', className].join(' ')}>
      <div
        className="h-full rounded-full bg-accent transition-all duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
