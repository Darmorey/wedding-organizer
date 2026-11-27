import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '../auth/AuthProvider'
import { AddButton } from '../../core/ui/AddButton'
import { Button } from '../../core/ui/Button'
import { EmptyState } from '../../core/ui/EmptyState'
import { Input } from '../../core/ui/Input'
import { OverflowMenu, OverflowMenuItem } from '../../core/ui/OverflowMenu'
import { formatTimelineRange } from '../../core/config/timeline'
import { timelineRepository } from '../../data/repositories/timelineRepository'
import type { TimelineEvent } from '../../core/types/entity'

interface Draft {
  title: string
  startTime: string
  endTime: string
  note: string
}

const EMPTY_DRAFT: Draft = { title: '', startTime: '', endTime: '', note: '' }

export function TimingPage() {
  const { activeProjectId } = useAuth()
  const [sheet, setSheet] = useState<'new' | TimelineEvent | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const events = useLiveQuery(async () => {
    if (!activeProjectId) return []
    return timelineRepository.listByProject(activeProjectId)
  }, [activeProjectId])

  const list = events ?? []

  function openNew() {
    setError(null)
    setDraft(EMPTY_DRAFT)
    setSheet('new')
  }

  function openEdit(event: TimelineEvent) {
    setError(null)
    setDraft({
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      note: event.note,
    })
    setSheet(event)
  }

  async function save() {
    if (!activeProjectId || busy) return
    if (!draft.title.trim()) {
      setError('Укажите, что происходит в этот слот')
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (sheet && sheet !== 'new') {
        await timelineRepository.update(activeProjectId, sheet.id, draft)
      } else {
        await timelineRepository.create(activeProjectId, draft)
      }
      setSheet(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить слот')
    } finally {
      setBusy(false)
    }
  }

  async function applyPreset() {
    if (!activeProjectId || busy) return
    setBusy(true)
    try {
      await timelineRepository.seedPreset(activeProjectId)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-accent-dark">Тайминг</h2>
          <p className="mt-1 text-sm text-muted">Расписание дня свадьбы — от сборов до трансфера</p>
        </div>
        <AddButton aria-label="Добавить слот" disabled={busy} onClick={openNew} />
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="Тайминг пока пуст"
          description="Соберите день по слотам: сборы, церемония, банкет, торт. Можно начать с готового примера и поправить под себя."
          action={
            <Button disabled={busy} onClick={() => void applyPreset()}>
              {busy ? 'Добавление…' : 'Вставить пример дня'}
            </Button>
          }
        />
      ) : (
        <ol className="relative space-y-0 border-l border-cream-dark ml-3">
          {list.map((event) => (
            <li key={event.id} className="relative ml-4 pb-4 last:pb-0">
              <span className="absolute -left-[1.35rem] top-3 size-2.5 rounded-full bg-accent" />
              <div className="rounded-2xl border border-cream-dark bg-white px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-coral">
                      {formatTimelineRange(event.startTime, event.endTime)}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-ink">{event.title}</p>
                    {event.note ? <p className="mt-1 text-xs text-muted">{event.note}</p> : null}
                  </div>
                  <OverflowMenu ariaLabel="Действия" widthClass="w-36">
                    {(close) => (
                      <>
                        <OverflowMenuItem
                          onClick={() => {
                            close()
                            openEdit(event)
                          }}
                        >
                          Изменить
                        </OverflowMenuItem>
                        <OverflowMenuItem
                          danger
                          onClick={() => {
                            close()
                            if (!activeProjectId) return
                            void timelineRepository.remove(activeProjectId, event.id)
                          }}
                        >
                          Удалить
                        </OverflowMenuItem>
                      </>
                    )}
                  </OverflowMenu>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {sheet ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
          onClick={() => {
            if (!busy) setSheet(null)
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg" onClick={(event) => event.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold text-ink">
              {sheet === 'new' ? 'Новый слот' : 'Слот'}
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Начало"
                  name="startTime"
                  type="time"
                  value={draft.startTime}
                  onChange={(event) => setDraft((current) => ({ ...current, startTime: event.target.value }))}
                />
                <Input
                  label="Конец"
                  name="endTime"
                  type="time"
                  value={draft.endTime}
                  onChange={(event) => setDraft((current) => ({ ...current, endTime: event.target.value }))}
                />
              </div>
              <Input
                label="Что происходит"
                name="title"
                placeholder="Церемония, welcome, торт…"
                autoFocus
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              />
              <label htmlFor="timelineNote" className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink">Заметка</span>
                <textarea
                  id="timelineNote"
                  rows={3}
                  placeholder="Адрес, кто отвечает, запас по времени"
                  value={draft.note}
                  onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
                  className="w-full resize-y rounded-xl border border-cream-dark bg-white px-3 py-2.5 text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </label>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <div className="flex gap-2">
                <Button variant="secondary" fullWidth disabled={busy} onClick={() => setSheet(null)}>
                  Отмена
                </Button>
                <Button fullWidth disabled={busy} onClick={() => void save()}>
                  {busy ? 'Сохранение…' : sheet === 'new' ? 'Добавить' : 'Сохранить'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
