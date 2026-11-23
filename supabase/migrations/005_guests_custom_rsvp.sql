-- Свои статусы RSVP (произвольный текст, синхронизация с клиентом)
-- Выполнить в Supabase SQL Editor после 003/004

alter table public.guests
  drop constraint if exists guests_rsvp_check;

alter table public.guests
  add constraint guests_rsvp_check
  check (char_length(rsvp) >= 1 and char_length(rsvp) <= 64);