export interface TimelinePresetItem {
  startTime: string
  endTime: string
  title: string
  note: string
}

export const TIMELINE_PRESET: TimelinePresetItem[] = [
  { startTime: '08:00', endTime: '09:30', title: 'Подъём и сборы', note: 'Завтрак, сборы, документы и кольца' },
  { startTime: '09:30', endTime: '11:30', title: 'Стилист', note: 'Причёска и макияж' },
  { startTime: '11:30', endTime: '12:30', title: 'Съёмка сборов', note: 'Фото и видео в локации сборов' },
  { startTime: '12:30', endTime: '13:30', title: 'Выезд', note: 'Дорога с запасом на пробки' },
  { startTime: '13:30', endTime: '14:30', title: 'Регистрация или церемония', note: '' },
  { startTime: '14:30', endTime: '16:30', title: 'Прогулка / фотосессия', note: '' },
  { startTime: '16:30', endTime: '17:30', title: 'Welcome', note: 'Встреча гостей' },
  { startTime: '17:30', endTime: '19:00', title: 'Начало банкета', note: 'Вход, приветствие, ужин' },
  { startTime: '19:00', endTime: '19:30', title: 'Первый танец', note: '' },
  { startTime: '21:00', endTime: '21:30', title: 'Торт', note: '' },
  { startTime: '23:00', endTime: '23:30', title: 'Завершение программы', note: '' },
  { startTime: '23:30', endTime: '', title: 'Транспорт после свадьбы', note: 'Трансфер пары и гостей' },
]

export function compareTimelineTime(a: string, b: string) {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return a.localeCompare(b)
}

export function formatTimelineRange(startTime: string, endTime: string) {
  if (startTime && endTime) return `${startTime} – ${endTime}`
  if (startTime) return startTime
  if (endTime) return `до ${endTime}`
  return 'Время не указано'
}
