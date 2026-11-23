-- Статус «не приглашаем» (письмо-отказ) — отдельно от RSVP «не придёт»
-- Выполнить в Supabase SQL Editor

alter table public.guests
  drop constraint if exists guests_rsvp_check;

alter table public.guests
  add constraint guests_rsvp_check
  check (rsvp in ('pending', 'yes', 'no', 'not_invited'));