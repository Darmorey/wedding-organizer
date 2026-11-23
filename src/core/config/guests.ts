import type { BuiltinRsvpStatus } from '../types/entity'
import type { CustomRsvpStatus } from './guestProjectPrefs'

export const GUEST_GROUPS = [
  'Друзья',
  'Семья невесты',
  'Семья жениха',
  'Коллеги',
] as const

export const GUEST_GROUP_SHORT: Record<(typeof GUEST_GROUPS)[number], string> = {
  'Семья невесты': 'Невеста',
  'Семья жениха': 'Жених',
  Друзья: 'Друзья',
  Коллеги: 'Работа',
}

export const GUEST_ADD_GROUP_OPTION = '__add_guest_group__'
export const GUEST_ADD_RSVP_OPTION = '__add_rsvp_status__'

export function isBuiltinGuestGroup(group: string): group is (typeof GUEST_GROUPS)[number] {
  return (GUEST_GROUPS as readonly string[]).includes(group)
}

export function guestGroupShortLabel(group: string): string {
  if (group in GUEST_GROUP_SHORT) {
    return GUEST_GROUP_SHORT[group as keyof typeof GUEST_GROUP_SHORT]
  }
  return group.length > 10 ? `${group.slice(0, 9)}…` : group
}

export function mergeGuestGroupOptions(
  guests: readonly { guestGroup: string }[],
  extra: readonly string[] = [],
  hiddenBuiltin: readonly string[] = [],
): string[] {
  const set = new Set<string>()
  for (const group of GUEST_GROUPS) {
    if (!hiddenBuiltin.includes(group)) set.add(group)
  }
  for (const group of extra) set.add(group)
  for (const guest of guests) {
    const g = guest.guestGroup?.trim()
    if (g) set.add(g)
  }
  return [...set]
}

/** Статусы приглашения / RSVP (порядок кнопок в строке гостя). */
export const RSVP_STATUSES: readonly BuiltinRsvpStatus[] = [
  'pending',
  'yes',
  'no',
  'not_invited',
] as const

export function isBuiltinRsvpStatus(value: string): value is BuiltinRsvpStatus {
  return (RSVP_STATUSES as readonly string[]).includes(value)
}

export function isCustomRsvpStatus(value: string): value is `custom:${string}` {
  return value.startsWith('custom:')
}

export function createCustomRsvpId(): string {
  return `custom:${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`
}

export function rsvpCompactLabel(
  rsvp: string,
  customStatuses: readonly CustomRsvpStatus[] = [],
): string {
  if (isBuiltinRsvpStatus(rsvp)) return RSVP_COMPACT_LABELS[rsvp]
  const custom = customStatuses.find((s) => s.id === rsvp)
  const label = custom?.label ?? rsvp.replace(/^custom:/, '')
  return label.length > 8 ? `${label.slice(0, 7)}…` : label
}

export const RSVP_LABELS: Record<BuiltinRsvpStatus, string> = {
  pending: 'Ждёт ответ',
  yes: 'Придёт',
  no: 'Не придёт',
  not_invited: 'Письмо-отказ',
}

export const RSVP_SHORT_LABELS: Record<BuiltinRsvpStatus, string> = {
  pending: 'Ждут',
  yes: 'Придут',
  no: 'Не придут',
  not_invited: 'Письмо-отказ',
}

/** Короткие подписи в компактной строке */
export const RSVP_COMPACT_LABELS: Record<BuiltinRsvpStatus, string> = {
  pending: 'Ждёт',
  yes: 'Да',
  no: 'Нет',
  not_invited: 'Отказ',
}

/** Компактный select — в строке гостя и в фильтрах */
export const GUEST_COMPACT_SELECT_CLASS =
  'max-w-[5.5rem] shrink-0 rounded-lg border-0 bg-cream/80 py-1 pl-1.5 pr-6 text-[11px] font-medium text-ink focus:ring-1 focus:ring-accent/30'