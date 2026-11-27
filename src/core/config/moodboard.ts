export const DECOR_CATEGORY_NAME = 'Декор и цветы'
export const VENUE_CATEGORY_NAME = 'Площадка'
export const CATERING_CATEGORY_NAME = 'Кейтеринг'
export const CLOTHES_CATEGORY_NAME = 'Одежда'

export type MoodBoardMode = 'none' | 'grid' | 'canvas'
export type PlaceBoardKind = 'venue' | 'clothes'

export interface PlaceBoardCopy {
  addAria: string
  emptyTitle: string
  emptyDescription: string
  nameRequired: string
  saveError: string
  sheetTitleNew: string
  sheetTitleEdit: string
  nameLabel: string
  namePlaceholder: string
  showDetails: boolean
  detailsLabel: string
  detailsPlaceholder: string
  detailsSuffix?: string
  commentPlaceholder: string
  cardNameFallback: string
  detailsFallback?: string
}

export const VENUE_BOARD_COPY: PlaceBoardCopy = {
  addAria: 'Добавить место',
  emptyTitle: 'Площадок пока нет',
  emptyDescription: 'Нажмите + и добавьте место: фото, название, бюджет и ссылку.',
  nameRequired: 'Укажите место',
  saveError: 'Не удалось сохранить место',
  sheetTitleNew: 'Добавить место',
  sheetTitleEdit: 'Место',
  nameLabel: 'Место',
  namePlaceholder: 'Название площадки',
  showDetails: true,
  detailsLabel: 'Кол-во человек',
  detailsPlaceholder: '120',
  detailsSuffix: 'чел',
  commentPlaceholder: 'Заметка о площадке',
  cardNameFallback: 'Место',
  detailsFallback: 'чел',
}

export const CLOTHES_BOARD_COPY: PlaceBoardCopy = {
  addAria: 'Добавить вариант',
  emptyTitle: 'Вариантов пока нет',
  emptyDescription: 'Нажмите + и добавьте образ. Карточки можно двигать по полю и менять размер за угол.',
  nameRequired: 'Укажите название',
  saveError: 'Не удалось сохранить вариант',
  sheetTitleNew: 'Добавить вариант',
  sheetTitleEdit: 'Вариант',
  nameLabel: 'Название',
  namePlaceholder: 'Платье, костюм, образ',
  showDetails: false,
  detailsLabel: '',
  detailsPlaceholder: '',
  commentPlaceholder: 'Заметка об одежде',
  cardNameFallback: 'Образ',
}

export function placeBoardKind(name: string): PlaceBoardKind | null {
  const normalized = name.trim().toLowerCase()
  if (normalized.includes('площадк')) return 'venue'
  if (normalized.includes('одежд')) return 'clothes'
  return null
}

export function placeBoardCopy(name: string): PlaceBoardCopy | null {
  const kind = placeBoardKind(name)
  if (kind === 'venue') return VENUE_BOARD_COPY
  if (kind === 'clothes') return CLOTHES_BOARD_COPY
  return null
}

export function moodBoardMode(name: string): MoodBoardMode {
  const normalized = name.trim().toLowerCase()
  if (normalized.includes('кейтеринг') || normalized.includes('декор')) return 'canvas'
  if (placeBoardKind(name)) return 'grid'
  return 'none'
}

export function canvasAllowsCards(name: string): boolean {
  return name.trim().toLowerCase().includes('декор')
}

export function categoryHasMoodBoard(name: string): boolean {
  return moodBoardMode(name) !== 'none'
}

export function isVenueMoodBoard(name: string): boolean {
  return placeBoardKind(name) === 'venue'
}

export function venueCardFields(item: { caption: string; url: string; metadata?: Record<string, unknown> }) {
  const metadata = item.metadata ?? {}
  return {
    place: item.caption.trim(),
    budget: typeof metadata.budget === 'string' ? metadata.budget : '',
    details: typeof metadata.details === 'string' ? metadata.details : '',
    comment: typeof metadata.comment === 'string' ? metadata.comment : '',
    url: item.url.trim(),
    chosen: metadata.chosen === true,
  }
}

export function parseMoneyAmount(value: string) {
  const digits = value.replace(/\D/g, '')
  if (!digits) return 0
  return Number(digits)
}

export function formatMoneyInput(value: string) {
  const amount = parseMoneyAmount(value)
  if (!amount) return ''
  return amount.toLocaleString('ru-RU')
}

export function formatMoneyAmount(value: number) {
  if (!Number.isFinite(value)) return '0 ₽'
  const abs = Math.abs(Math.round(value)).toLocaleString('ru-RU')
  return value < 0 ? `−${abs} ₽` : `${abs} ₽`
}

export function formatVenueBudget(value: string) {
  const formatted = formatMoneyInput(value)
  if (!formatted) return ''
  return `${formatted} ₽`
}

export function formatVenuePeople(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/чел/i.test(trimmed)) return trimmed
  return `${trimmed} чел`
}