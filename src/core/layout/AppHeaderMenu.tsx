import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../features/auth/AuthProvider'
import {
  bootstrapNewProject,
  deleteWeddingProject,
  renameWeddingProject,
} from '../../data/supabase/projectService'
import { OverflowMenu, OverflowMenuItem } from '../ui/OverflowMenu'
import type { WeddingProject } from '../../core/types/entity'
import { translateAuthError } from '../../features/auth/utils/authErrors'

type MenuPanel = 'root' | 'projects' | 'create' | 'rename'

export function AppHeaderMenu() {
  const { session, user, projects, activeProjectId, setActiveProjectId, refreshProjects } = useAuth()
  const createInputRef = useRef<HTMLInputElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const [panel, setPanel] = useState<MenuPanel>('root')
  const [rowMenuId, setRowMenuId] = useState<string | null>(null)
  const [renameTarget, setRenameTarget] = useState<WeddingProject | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [createName, setCreateName] = useState('')
  const [renameName, setRenameName] = useState('')

  useEffect(() => {
    if (panel === 'create') createInputRef.current?.focus()
    if (panel === 'rename') renameInputRef.current?.focus()
  }, [panel])

  if (!session) return null

  const deleting = deletingId !== null

  function resetMenu() {
    setPanel('root')
    setRowMenuId(null)
    setRenameTarget(null)
    setFormError(null)
    setCreateName('')
  }

  function isProjectOwner(project: WeddingProject) {
    return Boolean(user?.id && user.id === project.ownerId)
  }

  async function handleDeleteProject(project: WeddingProject, close: () => void) {
    if (!isProjectOwner(project) || deleting) return
    const ok = window.confirm(
      `Удалить проект «${project.name}»?\n\nВсе задачи, гости и данные проекта будут удалены безвозвратно.`,
    )
    if (!ok) return

    setDeletingId(project.id)
    setRowMenuId(null)
    close()
    resetMenu()
    try {
      await deleteWeddingProject(project.id)
      await refreshProjects()
    } catch (error) {
      console.error(error)
      window.alert(
        error instanceof Error ? translateAuthError(error.message) : 'Не удалось удалить проект',
      )
    } finally {
      setDeletingId(null)
    }
  }

  async function handleCreateProject(close: () => void) {
    if (busy) return
    const name = createName.trim()
    if (!name) {
      setFormError('Введите название')
      return
    }

    setBusy(true)
    setFormError(null)
    try {
      const project = await bootstrapNewProject(name)
      await refreshProjects()
      setActiveProjectId(project.id)
      resetMenu()
      close()
    } catch (error) {
      console.error(error)
      setFormError(
        error instanceof Error ? translateAuthError(error.message) : 'Не удалось создать проект',
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleRenameProject(close: () => void) {
    if (!renameTarget || !isProjectOwner(renameTarget) || busy) return
    const name = renameName.trim()
    if (!name) {
      setFormError('Введите название')
      return
    }

    setBusy(true)
    setFormError(null)
    try {
      await renameWeddingProject(renameTarget.id, name)
      await refreshProjects()
      resetMenu()
      close()
    } catch (error) {
      console.error(error)
      setFormError(
        error instanceof Error ? translateAuthError(error.message) : 'Не удалось сохранить название',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <OverflowMenu ariaLabel="Меню проекта" disabled={deleting} widthClass="w-56" onClose={resetMenu}>
      {(close) => {
        if (panel === 'create') {
          return (
            <FormPanel
              title="Новый проект"
              value={createName}
              inputRef={createInputRef}
              busy={busy}
              error={formError}
              placeholder="Например: Свадьба 2026"
              submitLabel={busy ? 'Создание…' : 'Создать'}
              onChange={setCreateName}
              onSubmit={() => void handleCreateProject(close)}
              onBack={() => {
                setFormError(null)
                setPanel('projects')
              }}
            />
          )
        }

        if (panel === 'rename' && renameTarget) {
          return (
            <FormPanel
              title="Отредактировать"
              value={renameName}
              inputRef={renameInputRef}
              busy={busy}
              error={formError}
              submitLabel={busy ? 'Сохранение…' : 'Сохранить'}
              onChange={setRenameName}
              onSubmit={() => void handleRenameProject(close)}
              onBack={() => {
                setFormError(null)
                setRenameTarget(null)
                setPanel('projects')
              }}
            />
          )
        }

        if (panel === 'projects') {
          return (
            <>
              <OverflowMenuItem onClick={() => setPanel('root')}>← Назад</OverflowMenuItem>
              {projects.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted">Нет проектов</p>
              ) : (
                projects.map((project) => {
                  const active = project.id === activeProjectId
                  const owner = isProjectOwner(project)
                  const rowOpen = rowMenuId === project.id
                  return (
                    <div key={project.id} className="relative flex items-stretch">
                      <button
                        type="button"
                        disabled={deleting}
                        className={[
                          'flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-cream/80 disabled:opacity-50',
                          active ? 'font-medium text-accent' : 'text-ink',
                        ].join(' ')}
                        onClick={() => {
                          setActiveProjectId(project.id)
                          resetMenu()
                          close()
                        }}
                      >
                        <span className="truncate">{project.name}</span>
                        {active ? <span className="shrink-0 text-xs">✓</span> : null}
                      </button>
                      {owner ? (
                        <button
                          type="button"
                          disabled={deleting}
                          aria-label={`Действия с проектом ${project.name}`}
                          aria-expanded={rowOpen}
                          className="shrink-0 px-2 py-0.5 text-xl leading-none text-muted hover:bg-cream disabled:opacity-40"
                          onClick={(e) => {
                            e.stopPropagation()
                            setRowMenuId(rowOpen ? null : project.id)
                          }}
                        >
                          ⋮
                        </button>
                      ) : null}
                      {rowOpen ? (
                        <>
                          <button
                            type="button"
                            className="fixed inset-0 z-30"
                            aria-label="Закрыть меню проекта"
                            onClick={() => setRowMenuId(null)}
                          />
                          <div
                            role="menu"
                            className="absolute right-0 top-full z-40 mt-0.5 w-44 rounded-xl border border-cream-dark bg-white py-1 text-sm shadow-md"
                          >
                            <OverflowMenuItem
                              onClick={() => {
                                setRowMenuId(null)
                                setRenameTarget(project)
                                setRenameName(project.name)
                                setFormError(null)
                                setPanel('rename')
                              }}
                            >
                              Отредактировать
                            </OverflowMenuItem>
                            <OverflowMenuItem
                              danger
                              disabled={deleting}
                              onClick={() => void handleDeleteProject(project, close)}
                            >
                              Удалить
                            </OverflowMenuItem>
                          </div>
                        </>
                      ) : null}
                    </div>
                  )
                })
              )}
              <OverflowMenuItem
                accent
                disabled={deleting}
                onClick={() => {
                  setFormError(null)
                  setRowMenuId(null)
                  setPanel('create')
                }}
              >
                Создать проект
              </OverflowMenuItem>
            </>
          )
        }

        return (
          <OverflowMenuItem
            onClick={() => {
              setRowMenuId(null)
              setPanel('projects')
            }}
          >
            Проект
          </OverflowMenuItem>
        )
      }}
    </OverflowMenu>
  )
}

function FormPanel({
  title,
  value,
  inputRef,
  busy,
  error,
  placeholder,
  submitLabel,
  onChange,
  onSubmit,
  onBack,
}: {
  title: string
  value: string
  inputRef: React.RefObject<HTMLInputElement | null>
  busy: boolean
  error: string | null
  placeholder?: string
  submitLabel: string
  onChange: (value: string) => void
  onSubmit: () => void
  onBack: () => void
}) {
  return (
    <div className="space-y-2 px-3 py-2">
      <p className="font-label text-[10px] font-medium uppercase tracking-wide text-coral">{title}</p>
      <input
        ref={inputRef}
        type="text"
        value={value}
        disabled={busy}
        placeholder={placeholder}
        className="w-full rounded-xl border border-cream-dark bg-white px-3 py-2 text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit()
        }}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <OverflowMenuItem disabled={busy} accent onClick={onSubmit}>
        {submitLabel}
      </OverflowMenuItem>
      <OverflowMenuItem disabled={busy} onClick={onBack}>
        Назад
      </OverflowMenuItem>
    </div>
  )
}