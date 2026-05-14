create table if not exists public.inbox_thread_states (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  last_read_at timestamptz,
  starred_at timestamptz,
  updated_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, project_id, thread_id)
);

create index if not exists inbox_thread_states_workspace_project_idx
  on public.inbox_thread_states (workspace_id, project_id);

create index if not exists inbox_thread_states_starred_idx
  on public.inbox_thread_states (workspace_id, project_id, starred_at desc)
  where starred_at is not null;

create trigger set_updated_at_inbox_thread_states
before update on public.inbox_thread_states
for each row execute function public.set_updated_at();

alter table public.inbox_thread_states enable row level security;

drop policy if exists "workspace members can access inbox thread states" on public.inbox_thread_states;
create policy "workspace members can access inbox thread states"
  on public.inbox_thread_states for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

notify pgrst, 'reload schema';
