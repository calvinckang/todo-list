-- Drop the permissive policy and add user-scoped RLS
drop policy if exists "Allow all for now" on public.todos;

create policy "Users can select own todos"
  on public.todos for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own todos"
  on public.todos for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own todos"
  on public.todos for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own todos"
  on public.todos for delete
  to authenticated
  using (auth.uid() = user_id);

-- Trigger to set user_id on insert (prevents spoofing)
create or replace function public.set_todos_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;

drop trigger if exists set_todos_user_id_trigger on public.todos;
create trigger set_todos_user_id_trigger
  before insert on public.todos
  for each row
  execute function public.set_todos_user_id();

-- RPC to migrate todos from anonymous user to signed-in user (call after signInWithPassword)
create or replace function public.migrate_todos_from_anonymous(anonymous_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from auth.users
    where id = anonymous_user_id and is_anonymous = true
  ) then
    return;
  end if;
  update public.todos
  set user_id = auth.uid()
  where user_id = anonymous_user_id;
end;
$$;

grant execute on function public.migrate_todos_from_anonymous(uuid) to authenticated;
