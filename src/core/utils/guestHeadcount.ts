import type { Guest, RsvpStatus } from '../types/entity'

const ATTENDING: RsvpStatus[] = ['yes']
const EXPECTED: RsvpStatus[] = ['yes', 'pending']

export interface HeadcountBreakdown {
  adults: number
  children: number
  total: number
}

function isInvitedGuest(guest: Guest): boolean {
  return guest.rsvp !== 'not_invited'
}

function headcountForGuest(guest: Guest): HeadcountBreakdown {
  const adults = 1 + (guest.plusOne && !guest.plusOneIsChild ? 1 : 0)
  const children = guest.plusOne && guest.plusOneIsChild ? 1 : 0
  return { adults, children, total: adults + children }
}

export function sumHeadcount(
  guests: Guest[],
  rsvpIn: readonly RsvpStatus[],
): HeadcountBreakdown {
  let adults = 0
  let children = 0

  for (const guest of guests) {
    if (!rsvpIn.includes(guest.rsvp)) continue
    const part = headcountForGuest(guest)
    adults += part.adults
    children += part.children
  }

  return { adults, children, total: adults + children }
}

export function getGuestHeadcountSummary(guests: Guest[]) {
  const invited = guests.filter(isInvitedGuest)
  const attending = sumHeadcount(invited, ATTENDING)
  const expected = sumHeadcount(invited, EXPECTED)
  const inList = sumHeadcount(
    invited.filter((g) => g.rsvp !== 'no'),
    ['yes', 'pending'],
  )

  return { attending, expected, inList }
}