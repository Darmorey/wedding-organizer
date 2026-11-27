import type { CategoryTemplate } from './templates'

export type WeddingFormat = 'banquet' | 'intimate_dinner' | 'outdoor' | 'party' | 'ceremony_dinner'
export type GuestScale = 'small' | 'medium' | 'large'
export type BudgetLevel = 'modest' | 'medium' | 'open'
export type WeddingPriority = 'venue' | 'photo' | 'party' | 'looks' | 'honeymoon'
export type WeddingTimeline = 'year' | 'six' | 'three' | 'soon' | 'season'
export type WeddingOrganizer = 'couple' | 'family' | 'day_coordinator' | 'planner'

export interface ProjectSurveyAnswers {
  format: WeddingFormat
  guests: GuestScale
  budget: BudgetLevel
  priorities: WeddingPriority[]
  timeline: WeddingTimeline
  organizer: WeddingOrganizer
}

export interface WeddingPlan {
  size: GuestScale
  title: string
  summary: string
  categories: CategoryTemplate[]
}

export const FORMAT_OPTIONS: { id: WeddingFormat; label: string; hint: string }[] = [
  { id: 'banquet', label: 'Большой банкет', hint: 'Классический вечер в зале' },
  { id: 'intimate_dinner', label: 'Камерный ужин', hint: 'Семейное или небольшое торжество' },
  { id: 'outdoor', label: 'Загородная или на природе', hint: 'Усадьба, шатёр, выезд' },
  { id: 'party', label: 'Вечеринка с друзьями', hint: 'Музыка и атмосфера важнее протокола' },
  { id: 'ceremony_dinner', label: 'Регистрация и ужин', hint: 'Официальная часть и спокойный приём' },
]

export const GUEST_OPTIONS: { id: GuestScale; label: string; hint: string }[] = [
  { id: 'small', label: 'До 30 гостей', hint: 'Камерная свадьба' },
  { id: 'medium', label: '30–70 гостей', hint: 'Средний формат' },
  { id: 'large', label: '70 и больше', hint: 'Большая свадьба' },
]

export const BUDGET_OPTIONS: { id: BudgetLevel; label: string; hint: string }[] = [
  { id: 'modest', label: 'Скромный', hint: 'Оставляем 1–2 главных вещи, остальное упрощаем' },
  { id: 'medium', label: 'Средний', hint: 'Полноценный праздник без лишнего' },
  { id: 'open', label: 'Без жёсткого потолка', hint: 'Важнее попасть в желаемый формат' },
]

export const PRIORITY_OPTIONS: { id: WeddingPriority; label: string }[] = [
  { id: 'venue', label: 'Площадка и вид' },
  { id: 'photo', label: 'Фото и видео' },
  { id: 'party', label: 'Гости и праздник' },
  { id: 'looks', label: 'Образы' },
  { id: 'honeymoon', label: 'Путешествие после' },
]

export const TIMELINE_OPTIONS: { id: WeddingTimeline; label: string; hint: string }[] = [
  { id: 'year', label: '9–12 месяцев', hint: 'Спокойный план' },
  { id: 'six', label: 'Около 6 месяцев', hint: 'Часть шагов параллельно' },
  { id: 'three', label: 'Около 3 месяцев', hint: 'Быстрые решения' },
  { id: 'soon', label: 'Дата уже скоро', hint: 'Только критичное' },
  { id: 'season', label: 'Сезон есть, даты нет', hint: 'План с резервными датами' },
]

export const ORGANIZER_OPTIONS: { id: WeddingOrganizer; label: string; hint: string }[] = [
  { id: 'couple', label: 'Сами, вдвоём', hint: 'Нужен ответственный на сам день' },
  { id: 'family', label: 'Сами и близкие', hint: 'Часть задач можно раздать семье' },
  { id: 'day_coordinator', label: 'Координатор на день', hint: 'Подготовка своя, день — у специалиста' },
  { id: 'planner', label: 'Организатор на подготовку', hint: 'Бриф, контроль и договоры с ним' },
]

const SIZE_TITLE: Record<GuestScale, string> = {
  small: 'Камерная свадьба',
  medium: 'Средняя свадьба',
  large: 'Большая свадьба',
}

const FORMAT_LABEL: Record<WeddingFormat, string> = Object.fromEntries(
  FORMAT_OPTIONS.map((option) => [option.id, option.label.toLowerCase()]),
) as Record<WeddingFormat, string>

const TIMELINE_LABEL: Record<WeddingTimeline, string> = {
  year: 'подготовка около года',
  six: 'подготовка около 6 месяцев',
  three: 'подготовка около 3 месяцев',
  soon: 'дата уже близко',
  season: 'сначала сезон и резервные даты',
}

const ORGANIZER_LABEL: Record<WeddingOrganizer, string> = {
  couple: 'готовите сами',
  family: 'помогают близкие',
  day_coordinator: 'координатор на день свадьбы',
  planner: 'организатор ведёт подготовку',
}

const PRIORITY_LABEL: Record<WeddingPriority, string> = Object.fromEntries(
  PRIORITY_OPTIONS.map((option) => [option.id, option.label.toLowerCase()]),
) as Record<WeddingPriority, string>

export function describeWeddingPlan(answers: ProjectSurveyAnswers): Omit<WeddingPlan, 'categories'> {
  const format = FORMAT_LABEL[answers.format]
  const budget =
    answers.budget === 'modest' ? 'скромный бюджет' : answers.budget === 'open' ? 'гибкий бюджет' : 'средний бюджет'
  const priorities =
    answers.priorities.length > 0
      ? `приоритет: ${answers.priorities.map((item) => PRIORITY_LABEL[item]).join(', ')}`
      : 'без жёстких приоритетов'
  const extras: string[] = []
  if (answers.format === 'outdoor') extras.push('план Б на погоду и логистика до локации')
  if (answers.organizer === 'couple' || answers.organizer === 'family') {
    extras.push('ответственный человек на день свадьбы')
  }
  if (answers.priorities.includes('honeymoon')) extras.push('усилен блок путешествия')

  const extraText = extras.length > 0 ? ` В план добавлены: ${extras.join(', ')}.` : ''

  return {
    size: answers.guests,
    title: SIZE_TITLE[answers.guests],
    summary: `${SIZE_TITLE[answers.guests]}: ${format}, ${budget}, ${priorities}, ${TIMELINE_LABEL[answers.timeline]}, ${ORGANIZER_LABEL[answers.organizer]}.${extraText}`,
  }
}
