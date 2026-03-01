create table public.todos (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id)
);

create index todos_user_id_idx on public.todos(user_id);

alter table public.todos enable row level security;
create policy "Allow all for now" on public.todos for all using (true);
