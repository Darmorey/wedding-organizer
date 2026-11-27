-- Тайминг дня свадьбы. Выполнить в Supabase SQL Editor, если нужна синхронизация между устройствами.

create table if not exists public.timeline_events (
  id uuid primary key,
  project_id uuid not null references public.wedding_projects (id) on delete cascade,
  title text not null,
  start_time text not null default '',
  end_time text not null default '',
  note text not null default '',
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create index if not exists timeline_events_project_id_idx
  on public.timeline_events (project_id);

alter table public.timeline_events enable row level security;

drop policy if exists timeline_events_select on public.timeline_events;
drop policy if exists timeline_events_write on public.timeline_events;

create policy timeline_events_select
  on public.timeline_events
  for select
  using (
    exists (
      select 1
      from public.project_members
      where project_members.project_id = timeline_events.project_id
        and project_members.user_id = auth.uid()
    )
  );

create policy timeline_events_write
  on public.timeline_events
  for all
  using (
    exists (
      select 1
      from public.project_members
      where project_members.project_id = timeline_events.project_id
        and project_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.project_members
      where project_members.project_id = timeline_events.project_id
        and project_members.user_id = auth.uid()
    )
  );
