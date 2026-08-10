export const GUEST_GROUPS = [
  'Семья невесты',
  'Семья жениха',
  'Друзья',
  'Коллеги',
  'Другие',
] as const

export const RSVP_LABELS: Record<'pending' | 'yes' | 'no', string> = {
  pending: 'Ждёт ответ',
  yes: 'Придёт',
  no: 'Не придёт',
}
