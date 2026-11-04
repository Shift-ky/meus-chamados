create table public.work_notepads (
 user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
 content text not null default '' check (length(content) <= 100000)
);
alter table public.work_notepads enable row level security;
revoke all on public.work_notepads from anon;
grant select, insert, update on public.work_notepads to authenticated;
create policy notepad_read on public.work_notepads for select to authenticated using ((select auth.uid()) = user_id);
create policy notepad_insert on public.work_notepads for insert to authenticated with check ((select auth.uid()) = user_id);
create policy notepad_update on public.work_notepads for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
