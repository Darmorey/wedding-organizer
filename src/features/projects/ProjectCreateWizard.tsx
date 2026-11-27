import { useMemo, useState } from 'react'
import { Button } from '../../core/ui/Button'
import { Input } from '../../core/ui/Input'
import { resolveWeddingPlan } from '../../core/config/planTemplates'
import {
  BUDGET_OPTIONS,
  FORMAT_OPTIONS,
  GUEST_OPTIONS,
  ORGANIZER_OPTIONS,
  PRIORITY_OPTIONS,
  TIMELINE_OPTIONS,
  type BudgetLevel,
  type GuestScale,
  type ProjectSurveyAnswers,
  type WeddingFormat,
  type WeddingOrganizer,
  type WeddingPriority,
  type WeddingTimeline,
} from '../../core/config/projectSurvey'
import type { CategoryTemplate } from '../../core/config/templates'

const STEPS = ['name', 'format', 'guests', 'budget', 'timeline', 'organizer', 'preview'] as const
type Step = (typeof STEPS)[number]

interface Draft {
  name: string
  format: WeddingFormat | null
  guests: GuestScale | null
  budget: BudgetLevel | null
  priorities: WeddingPriority[]
  timeline: WeddingTimeline | null
  organizer: WeddingOrganizer | null
}

const EMPTY_DRAFT: Draft = {
  name: '',
  format: null,
  guests: null,
  budget: null,
  priorities: [],
  timeline: null,
  organizer: null,
}

export interface ProjectCreateWizardProps {
  submitting?: boolean
  error?: string | null
  cancelLabel?: string
  onCancel?: () => void
  onCreate: (name: string, templates: CategoryTemplate[] | null) => void
}

export function ProjectCreateWizard({
  submitting = false,
  error,
  cancelLabel,
  onCancel,
  onCreate,
}: ProjectCreateWizardProps) {
  const [step, setStep] = useState<Step>('name')
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [openCategory, setOpenCategory] = useState<string | null>(null)

  const stepIndex = STEPS.indexOf(step)
  const answers = useMemo(() => toAnswers(draft), [draft])
  const plan = answers ? resolveWeddingPlan(answers) : null

  function goNext() {
    const next = STEPS[stepIndex + 1]
    if (next) setStep(next)
  }

  function goBack() {
    const prev = STEPS[stepIndex - 1]
    if (prev) setStep(prev)
  }

  const canNext =
    (step === 'name' && draft.name.trim().length > 0) ||
    (step === 'format' && draft.format != null) ||
    (step === 'guests' && draft.guests != null) ||
    (step === 'budget' && draft.budget != null) ||
    (step === 'timeline' && draft.timeline != null) ||
    (step === 'organizer' && draft.organizer != null)

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
          Шаг {stepIndex + 1} из {STEPS.length}
        </p>
        <div className="flex gap-1">
          {STEPS.map((item, index) => (
            <span
              key={item}
              className={[
                'h-1.5 flex-1 rounded-full',
                index <= stepIndex ? 'bg-accent' : 'bg-cream-dark',
              ].join(' ')}
            />
          ))}
        </div>
      </div>

      {step === 'name' ? (
        <section className="space-y-3">
          <QuestionTitle title="Как назвать проект?" />
          <Input
            label="Название проекта"
            name="projectName"
            placeholder="Например: Свадьба Анны и Ивана"
            autoFocus
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          />
        </section>
      ) : null}

      {step === 'format' ? (
        <ChoiceList
          title="Какой формат свадьбы вы хотите?"
          options={FORMAT_OPTIONS}
          value={draft.format}
          onChange={(format) => setDraft((current) => ({ ...current, format }))}
        />
      ) : null}

      {step === 'guests' ? (
        <ChoiceList
          title="Сколько примерно будет гостей?"
          options={GUEST_OPTIONS}
          value={draft.guests}
          onChange={(guests) => setDraft((current) => ({ ...current, guests }))}
        />
      ) : null}

      {step === 'budget' ? (
        <section className="space-y-4">
          <ChoiceList
            title="Какой бюджет вы готовы выделить?"
            options={BUDGET_OPTIONS}
            value={draft.budget}
            onChange={(budget) => setDraft((current) => ({ ...current, budget }))}
          />
          <div>
            <p className="mb-2 text-sm font-medium text-ink">Что нельзя урезать? Можно несколько</p>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map((option) => {
                const selected = draft.priorities.includes(option.id)
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={[
                      'rounded-full border px-3 py-1.5 text-sm transition-colors',
                      selected
                        ? 'border-accent bg-accent text-white'
                        : 'border-cream-dark bg-white text-ink hover:bg-cream',
                    ].join(' ')}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        priorities: selected
                          ? current.priorities.filter((item) => item !== option.id)
                          : [...current.priorities, option.id],
                      }))
                    }
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      ) : null}

      {step === 'timeline' ? (
        <ChoiceList
          title="Когда примерно должна пройти свадьба?"
          options={TIMELINE_OPTIONS}
          value={draft.timeline}
          onChange={(timeline) => setDraft((current) => ({ ...current, timeline }))}
        />
      ) : null}

      {step === 'organizer' ? (
        <ChoiceList
          title="Кто будет заниматься организацией?"
          options={ORGANIZER_OPTIONS}
          value={draft.organizer}
          onChange={(organizer) => setDraft((current) => ({ ...current, organizer }))}
        />
      ) : null}

      {step === 'preview' && plan ? (
        <section className="space-y-3">
          <QuestionTitle title="Ваш план подготовки" />
          <p className="rounded-xl bg-cream px-3 py-3 text-sm leading-relaxed text-ink">{plan.summary}</p>
          <p className="text-xs text-muted">
            {plan.categories.reduce((sum, item) => sum + item.tasks.length, 0)} задач в {plan.categories.length}{' '}
            разделах. Можно применить шаблон или создать пустые категории.
          </p>
          <ul className="max-h-56 space-y-1 overflow-y-auto">
            {plan.categories.map((category) => {
              const open = openCategory === category.name
              return (
                <li key={category.name} className="rounded-xl border border-cream-dark bg-white">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
                    onClick={() => setOpenCategory(open ? null : category.name)}
                  >
                    <span>
                      {category.icon} {category.name}
                    </span>
                    <span className="text-xs text-muted">{category.tasks.length}</span>
                  </button>
                  {open ? (
                    <ul className="space-y-1 border-t border-cream-dark px-3 py-2 text-xs text-muted">
                      {category.tasks.map((task) => (
                        <li key={task}>• {task}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-col gap-2">
        {step === 'preview' && plan ? (
          <>
            <Button
              fullWidth
              disabled={submitting}
              onClick={() => onCreate(draft.name.trim(), plan.categories)}
            >
              {submitting ? 'Создание…' : 'Применить шаблон'}
            </Button>
            <Button
              variant="secondary"
              fullWidth
              disabled={submitting}
              onClick={() => onCreate(draft.name.trim(), null)}
            >
              Создать без задач
            </Button>
          </>
        ) : (
          <Button fullWidth disabled={!canNext || submitting} onClick={goNext}>
            Далее
          </Button>
        )}
        {stepIndex > 0 ? (
          <Button variant="ghost" fullWidth disabled={submitting} onClick={goBack}>
            Назад
          </Button>
        ) : null}
        {onCancel ? (
          <Button variant="ghost" fullWidth disabled={submitting} onClick={onCancel}>
            {cancelLabel ?? 'Отмена'}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function toAnswers(draft: Draft): ProjectSurveyAnswers | null {
  if (!draft.format || !draft.guests || !draft.budget || !draft.timeline || !draft.organizer) return null
  return {
    format: draft.format,
    guests: draft.guests,
    budget: draft.budget,
    priorities: draft.priorities,
    timeline: draft.timeline,
    organizer: draft.organizer,
  }
}

function QuestionTitle({ title }: { title: string }) {
  return <h2 className="text-lg font-semibold text-ink">{title}</h2>
}

function ChoiceList<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string
  options: { id: T; label: string; hint: string }[]
  value: T | null
  onChange: (value: T) => void
}) {
  return (
    <section className="space-y-3">
      <QuestionTitle title={title} />
      <div className="space-y-2">
        {options.map((option) => {
          const selected = value === option.id
          return (
            <button
              key={option.id}
              type="button"
              className={[
                'w-full rounded-xl border px-3 py-3 text-left transition-colors',
                selected ? 'border-accent bg-cream' : 'border-cream-dark bg-white hover:bg-cream/60',
              ].join(' ')}
              onClick={() => onChange(option.id)}
            >
              <span className="block text-sm font-medium text-ink">{option.label}</span>
              <span className="mt-0.5 block text-xs text-muted">{option.hint}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
