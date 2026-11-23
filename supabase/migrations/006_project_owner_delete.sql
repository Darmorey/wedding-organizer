-- Владелец может удалить проект (каскадом уйдут гости, задачи и т.д.)
-- Выполнить в Supabase SQL Editor

create policy "owner_delete_projects" on public.wedding_projects
  for delete to authenticated
  using (owner_id = auth.uid());