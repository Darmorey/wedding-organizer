/**
 * Шаблон задач для нового проекта (при «Создать проект» на onboarding).
 * Списки задач — в папке `taskExamples`.
 */
import { TASK_EXAMPLES } from './taskExamples'

export interface CategoryTemplate {
  name: string
  icon: string
  tasks: string[]
}

export const CATEGORY_ICONS = {
  'Дата и бюджет': '📅',
  Площадка: '🏛️',
  Гости: '👥',
  Кейтеринг: '🍽️',
  'Декор и цветы': '💐',
  Одежда: '👗',
  Музыка: '🎵',
  'Фото и видео': '📷',
  Приглашения: '💌',
  Документы: '📄',
  'День свадьбы': '⏱️',
  'Медовый месяц': '✈️',
} as const

export const CATEGORY_TEMPLATES: CategoryTemplate[] = (
  Object.keys(CATEGORY_ICONS) as (keyof typeof CATEGORY_ICONS)[]
).map((name) => ({
  name,
  icon: CATEGORY_ICONS[name],
  tasks: TASK_EXAMPLES[name] ?? [],
}))

export function emptyCategoryTemplates(): CategoryTemplate[] {
  return (Object.keys(CATEGORY_ICONS) as (keyof typeof CATEGORY_ICONS)[]).map((name) => ({
    name,
    icon: CATEGORY_ICONS[name],
    tasks: [],
  }))
}
