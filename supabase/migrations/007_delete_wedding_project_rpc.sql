-- Удаление проекта владельцем (обходит отсутствие DELETE policy на wedding_projects)
-- Выполнить в Supabase Dashboard → SQL Editor

create or replace function public.delete_wedding_project(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.wedding_projects
    where id = p_project_id
      and owner_id = auth.uid()
  ) then
    raise exception 'Only the project owner can delete this project';
  end if;

  delete from public.wedding_projects where id = p_project_id;
end;
$$;

grant execute on function public.delete_wedding_project(uuid) to authenticated;