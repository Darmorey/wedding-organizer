export interface CustomRsvpStatus {
  id: string
  label: string
}

function customGroupsKey(projectId: string) {
  return `wedding-organizer:guest-custom-groups:${projectId}`
}

function hiddenBuiltinGroupsKey(projectId: string) {
  return `wedding-organizer:guest-hidden-builtin-groups:${projectId}`
}

function customRsvpKey(projectId: string) {
  return `wedding-organizer:guest-custom-rsvp:${projectId}`
}

function readJsonArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
  } catch {
    return []
  }
}

export function readCustomGuestGroups(projectId: string): string[] {
  return readJsonArray(customGroupsKey(projectId))
}

export function saveCustomGuestGroups(projectId: string, groups: string[]): void {
  localStorage.setItem(customGroupsKey(projectId), JSON.stringify([...new Set(groups.map((g) => g.trim()).filter(Boolean))]))
}

export function addCustomGuestGroup(projectId: string, name: string): string[] {
  const trimmed = name.trim()
  if (!trimmed) return readCustomGuestGroups(projectId)
  const next = [...new Set([...readCustomGuestGroups(projectId), trimmed])]
  saveCustomGuestGroups(projectId, next)
  return next
}

export function removeCustomGuestGroup(projectId: string, name: string): string[] {
  const next = readCustomGuestGroups(projectId).filter((g) => g !== name)
  saveCustomGuestGroups(projectId, next)
  return next
}

export function replaceCustomGuestGroup(projectId: string, from: string, to: string): string[] {
  const trimmed = to.trim()
  if (!trimmed) return readCustomGuestGroups(projectId)
  const without = readCustomGuestGroups(projectId).filter((g) => g !== from)
  const next = [...new Set([...without, trimmed])]
  saveCustomGuestGroups(projectId, next)
  return next
}

export function readHiddenBuiltinGuestGroups(projectId: string): string[] {
  return readJsonArray(hiddenBuiltinGroupsKey(projectId))
}

export function hideBuiltinGuestGroup(projectId: string, name: string): string[] {
  const next = [...new Set([...readHiddenBuiltinGuestGroups(projectId), name])]
  localStorage.setItem(hiddenBuiltinGroupsKey(projectId), JSON.stringify(next))
  return next
}

export function readCustomRsvpStatuses(projectId: string): CustomRsvpStatus[] {
  try {
    const raw = localStorage.getItem(customRsvpKey(projectId))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (x): x is CustomRsvpStatus =>
        typeof x === 'object' &&
        x !== null &&
        typeof (x as CustomRsvpStatus).id === 'string' &&
        typeof (x as CustomRsvpStatus).label === 'string' &&
        (x as CustomRsvpStatus).id.startsWith('custom:'),
    )
  } catch {
    return []
  }
}

export function saveCustomRsvpStatuses(projectId: string, statuses: CustomRsvpStatus[]): void {
  localStorage.setItem(customRsvpKey(projectId), JSON.stringify(statuses))
}

export function addCustomRsvpStatus(projectId: string, entry: CustomRsvpStatus): CustomRsvpStatus[] {
  const next = [...readCustomRsvpStatuses(projectId).filter((s) => s.id !== entry.id), entry]
  saveCustomRsvpStatuses(projectId, next)
  return next
}

export function removeCustomRsvpStatus(projectId: string, id: string): CustomRsvpStatus[] {
  const next = readCustomRsvpStatuses(projectId).filter((s) => s.id !== id)
  saveCustomRsvpStatuses(projectId, next)
  return next
}

export function updateCustomRsvpStatusLabel(
  projectId: string,
  id: string,
  label: string,
): CustomRsvpStatus[] {
  const trimmed = label.trim()
  if (!trimmed) return readCustomRsvpStatuses(projectId)
  const next = readCustomRsvpStatuses(projectId).map((s) =>
    s.id === id ? { ...s, label: trimmed } : s,
  )
  saveCustomRsvpStatuses(projectId, next)
  return next
}