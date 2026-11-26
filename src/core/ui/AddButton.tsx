import type { ButtonHTMLAttributes } from 'react'
import { Button } from './Button'

interface AddButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  busy?: boolean
  rotated?: boolean
}

export function AddButton({
  busy,
  rotated,
  className = '',
  'aria-label': ariaLabel = 'Добавить',
  ...props
}: AddButtonProps) {
  return (
    <Button
      className={[
        'shrink-0 px-4 transition-transform duration-300',
        rotated ? 'rotate-45' : 'rotate-0',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={ariaLabel}
      {...props}
    >
      {busy ? (
        '…'
      ) : (
        <span className="flex h-5 w-5 items-center justify-center text-lg font-medium leading-none">
          +
        </span>
      )}
    </Button>
  )
}