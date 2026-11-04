create table public.work_tickets (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 number text not null check (length(trim(number)) between 1 and 100),
 closed_on date not null,
 created_at timestamptz not null default now()
);
create unique index work_tickets_user_number on public.work_tickets (user_id, lower(trim(number)));
create index work_tickets_user_date on public.work_tickets (user_id, closed_on desc, created_at desc);
alter table public.work_tickets enable row level security;
revoke all on public.work_tickets from anon;
grant select, insert, delete on public.work_tickets to authenticated;
create policy tickets_read on public.work_tickets for select to authenticated using ((select auth.uid()) = user_id);
create policy tickets_insert on public.work_tickets for insert to authenticated with check ((select auth.uid()) = user_id);
create policy tickets_delete on public.work_tickets for delete to authenticated using ((select auth.uid()) = user_id);
