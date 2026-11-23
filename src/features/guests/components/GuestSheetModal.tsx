import type { ReactNode } from 'react'

interface GuestSheetModalProps {
  title: string
  onClose: () => void
  children: ReactNode
}

export function GuestSheetModal({ title, onClose, children }: GuestSheetModalProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/25 p-3 sm:items-center">
      <button
        type="button"
        aria-label="Закрыть"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex max-h-[min(85vh,32rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-cream-dark bg-white shadow-lg"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-cream-dark px-4 py-3">
          <h3 className="text-base font-semibold text-accent-dark">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-lg text-muted hover:bg-cream"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}