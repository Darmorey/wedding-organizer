-- Мудборд: картинки и ссылки, привязанные к категории
-- Run in Supabase Dashboard → SQL Editor

create table if not exists public.mood_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.wedding_projects (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  kind text not null check (kind in ('image', 'link')),
  caption text not null default '',
  url text not null default '',
  storage_path text not null default '',
  file_name text not null default '',
  mime_type text not null default '',
  size_bytes bigint not null default 0,
  upload_status text not null default 'uploaded'
    check (upload_status in ('pending', 'uploaded', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists mood_items_project_id_idx on public.mood_items (project_id);
create index if not exists mood_items_category_id_idx on public.mood_items (category_id);

drop trigger if exists mood_items_updated_at on public.mood_items;
create trigger mood_items_updated_at before update on public.mood_items
  for each row execute function public.set_updated_at();

alter table public.mood_items enable row level security;

drop policy if exists "members_all_mood_items" on public.mood_items;
create policy "members_all_mood_items" on public.mood_items
  for all to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

grant select, insert, update, delete on public.mood_items to authenticated;