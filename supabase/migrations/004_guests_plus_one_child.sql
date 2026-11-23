-- +1 как ребёнок (отдельная колонка для статистики взрослых/детей)
-- Выполнить в Supabase SQL Editor

alter table public.guests
  add column if not exists plus_one_is_child boolean not null default false;