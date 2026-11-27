import { useMemo, useState } from 'react'

interface TaskExamplesPanelProps {
  examples: string[]
  existingTitles: string[]
  disabled?: boolean
  onAdd: (titles: string[]) => Promise<void>
}

function normalize(title: string) {
  return title.trim().toLowerCase()
}

export function TaskExamplesPanel({
  examples,
  existingTitles,
  disabled,
  onAdd,
}: TaskExamplesPanelProps) {
  const [picked, setPicked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const taken = useMemo(() => new Set(existingTitles.map(normalize)), [existingTitles])
  const available = examples.filter((title) => !taken.has(normalize(title)))
  const selected = picked.filter((title) => available.includes(title))

  function toggle(title: string) {
    setPicked((current) =>
      current.includes(title) ? current.filter((entry) => entry !== title) : [...current, title],
    )
  }

  async function addTitles(titles: string[]) {
    if (disabled || busy || titles.length === 0) return
    setBusy(true)
    try {
      await onAdd(titles)
      setPicked((current) => current.filter((title) => !titles.includes(title)))
    } finally {
      setBusy(false)
    }
  }

  if (available.length === 0) {
    return (
      <p className="mb-3 rounded-xl border border-cream-dark bg-white px-3 py-2 text-xs text-muted">
        Все примеры уже в вашем списке.
      </p>
    )
  }

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-cream-dark bg-white">
      <ul>
        {available.map((title) => {
          const checked = selected.includes(title)
          return (
            <li key={title} className="flex items-center gap-2 border-b border-cream-dark/70 last:border-b-0 px-2 py-1.5">
              <button
                type="button"
                aria-pressed={checked}
                disabled={disabled || busy}
                onClick={() => toggle(title)}
                className={[
                  'flex size-5 shrink-0 items-center justify-center rounded border text-[11px]',
                  checked ? 'border-accent bg-accent text-white' : 'border-cream-dark bg-white text-transparent',
                ].join(' ')}
              >
                ✓
              </button>
              <button
                type="button"
                disabled={disabled || busy}
                onClick={() => toggle(title)}
                className="min-w-0 flex-1 text-left text-sm text-ink"
              >
                {title}
              </button>
              <button
                type="button"
                aria-label={`Добавить «${title}»`}
                disabled={disabled || busy}
                onClick={() => void addTitles([title])}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-lg text-accent-dark hover:bg-cream disabled:opacity-40"
              >
                +
              </button>
            </li>
          )
        })}
      </ul>
      {selected.length > 0 ? (
        <div className="border-t border-cream-dark bg-cream/60 px-2 py-2">
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => void addTitles(selected)}
            className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {busy ? 'Добавление…' : `Добавить выбранные (${selected.length})`}
          </button>
        </div>
      ) : (
        <p className="px-3 py-2 text-[11px] text-muted">Отметьте несколько задач или нажмите + у одной.</p>
      )}
    </div>
  )
}
