-- Fix: grant table access to authenticated role (RLS policies still apply)
-- Run in Supabase Dashboard → SQL Editor if project creation returns 403

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.wedding_projects to authenticated;
grant select, insert, update, delete on public.project_members to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.guests to authenticated;
grant select, insert, update, delete on public.budget_items to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
grant select, insert, update, delete on public.attachments to authenticated;

grant execute on function public.create_wedding_project(text) to authenticated;
grant execute on function public.join_project(text) to authenticated;
