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

export const CATEGORY_TEMPLATES: CategoryTemplate[] = [
  { name: 'Дата и бюджет', icon: '📅', tasks: TASK_EXAMPLES['Дата и бюджет'] ?? [] },
  { name: 'Площадка', icon: '🏛️', tasks: TASK_EXAMPLES['Площадка'] ?? [] },
  { name: 'Гости', icon: '👥', tasks: TASK_EXAMPLES['Гости'] ?? [] },
  { name: 'Кейтеринг', icon: '🍽️', tasks: TASK_EXAMPLES['Кейтеринг'] ?? [] },
  { name: 'Декор и цветы', icon: '💐', tasks: TASK_EXAMPLES['Декор и цветы'] ?? [] },
  { name: 'Одежда', icon: '👗', tasks: TASK_EXAMPLES['Одежда'] ?? [] },
  { name: 'Музыка', icon: '🎵', tasks: TASK_EXAMPLES['Музыка'] ?? [] },
  { name: 'Фото и видео', icon: '📷', tasks: TASK_EXAMPLES['Фото и видео'] ?? [] },
  { name: 'Приглашения', icon: '💌', tasks: TASK_EXAMPLES['Приглашения'] ?? [] },
  { name: 'Документы', icon: '📄', tasks: TASK_EXAMPLES['Документы'] ?? [] },
  { name: 'День свадьбы', icon: '⏱️', tasks: TASK_EXAMPLES['День свадьбы'] ?? [] },
  { name: 'Медовый месяц', icon: '✈️', tasks: TASK_EXAMPLES['Медовый месяц'] ?? [] },
]
