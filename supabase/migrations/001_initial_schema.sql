-- Wedding Organizer — initial schema
-- Run in Supabase Dashboard → SQL Editor

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Projects & members
-- ---------------------------------------------------------------------------

create table public.wedding_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_members (
  project_id uuid not null references public.wedding_projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index project_members_user_id_idx on public.project_members (user_id);

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members
    where project_id = p_project_id
      and user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Domain tables
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.wedding_projects (id) on delete cascade,
  name text not null,
  icon text not null default '📋',
  sort_order int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.wedding_projects (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  title text not null,
  done boolean not null default false,
  sort_order int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.wedding_projects (id) on delete cascade,
  name text not null,
  guest_group text not null default '',
  rsvp text not null default 'pending' check (rsvp in ('pending', 'yes', 'no')),
  plus_one boolean not null default false,
  notes text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.wedding_projects (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  title text not null,
  planned numeric not null default 0,
  actual numeric not null default 0,
  paid boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.wedding_projects (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  title text not null default '',
  content text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.wedding_projects (id) on delete cascade,
  note_id uuid not null references public.notes (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  caption text not null default '',
  upload_status text not null default 'pending'
    check (upload_status in ('pending', 'uploaded', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index categories_project_id_idx on public.categories (project_id);
create index tasks_project_id_idx on public.tasks (project_id);
create index tasks_category_id_idx on public.tasks (category_id);
create index guests_project_id_idx on public.guests (project_id);
create index budget_items_project_id_idx on public.budget_items (project_id);
create index notes_project_id_idx on public.notes (project_id);
create index attachments_project_id_idx on public.attachments (project_id);

-- updated_at triggers
create trigger wedding_projects_updated_at before update on public.wedding_projects
  for each row execute function public.set_updated_at();
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger guests_updated_at before update on public.guests
  for each row execute function public.set_updated_at();
create trigger budget_items_updated_at before update on public.budget_items
  for each row execute function public.set_updated_at();
create trigger notes_updated_at before update on public.notes
  for each row execute function public.set_updated_at();
create trigger attachments_updated_at before update on public.attachments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RPC: create & join project
-- ---------------------------------------------------------------------------

create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

create or replace function public.create_wedding_project(p_name text)
returns table (project_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_code text;
  v_attempts int := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  loop
    v_code := public.generate_invite_code();
    exit when not exists (select 1 from public.wedding_projects wp where wp.invite_code = v_code);
    v_attempts := v_attempts + 1;
    if v_attempts > 20 then
      raise exception 'Could not generate invite code';
    end if;
  end loop;

  insert into public.wedding_projects (name, invite_code, owner_id)
  values (p_name, v_code, auth.uid())
  returning id into v_project_id;

  insert into public.project_members (project_id, user_id, role)
  values (v_project_id, auth.uid(), 'owner');

  return query select v_project_id, v_code;
end;
$$;

create or replace function public.join_project(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_code := upper(trim(p_invite_code));

  select id into v_project_id
  from public.wedding_projects
  where invite_code = v_code;

  if v_project_id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (v_project_id, auth.uid(), 'editor')
  on conflict do nothing;

  return v_project_id;
end;
$$;

grant execute on function public.create_wedding_project(text) to authenticated;
grant execute on function public.join_project(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Grants (required when Supabase "Auto expose tables" is off)
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.wedding_projects to authenticated;
grant select, insert, update, delete on public.project_members to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.guests to authenticated;
grant select, insert, update, delete on public.budget_items to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
grant select, insert, update, delete on public.attachments to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.wedding_projects enable row level security;
alter table public.project_members enable row level security;
alter table public.categories enable row level security;
alter table public.tasks enable row level security;
alter table public.guests enable row level security;
alter table public.budget_items enable row level security;
alter table public.notes enable row level security;
alter table public.attachments enable row level security;

-- wedding_projects
create policy "members_select_projects" on public.wedding_projects
  for select to authenticated
  using (public.is_project_member(id));

create policy "owner_update_projects" on public.wedding_projects
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- project_members
create policy "members_select_membership" on public.project_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_project_member(project_id));

-- categories
create policy "members_all_categories" on public.categories
  for all to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

-- tasks
create policy "members_all_tasks" on public.tasks
  for all to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

-- guests
create policy "members_all_guests" on public.guests
  for all to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

-- budget_items
create policy "members_all_budget_items" on public.budget_items
  for all to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

-- notes
create policy "members_all_notes" on public.notes
  for all to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

-- attachments
create policy "members_all_attachments" on public.attachments
  for all to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

-- ---------------------------------------------------------------------------
-- Storage bucket for photos
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-assets',
  'project-assets',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create or replace function public.storage_project_id(object_name text)
returns uuid
language sql
immutable
as $$
  select nullif(split_part(object_name, '/', 1), '')::uuid;
$$;

create policy "members_select_project_assets" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'project-assets'
    and public.is_project_member(public.storage_project_id(name))
  );

create policy "members_insert_project_assets" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-assets'
    and public.is_project_member(public.storage_project_id(name))
  );

create policy "members_update_project_assets" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'project-assets'
    and public.is_project_member(public.storage_project_id(name))
  );

create policy "members_delete_project_assets" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-assets'
    and public.is_project_member(public.storage_project_id(name))
  );
