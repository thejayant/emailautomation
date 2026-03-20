alter table public.workspaces
  add column if not exists kind text not null default 'personal' check (kind in ('personal', 'shared'));

alter table public.profiles
  add column if not exists active_workspace_id uuid references public.workspaces(id) on delete set null;

update public.profiles
set active_workspace_id = coalesce(active_workspace_id, primary_workspace_id)
where active_workspace_id is null;

alter table public.gmail_accounts
  add column if not exists approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  add column if not exists approved_by_user_id uuid,
  add column if not exists approved_at timestamptz,
  add column if not exists approval_note text;

update public.gmail_accounts
set approval_status = 'approved',
    approved_at = coalesce(approved_at, created_at)
where approval_status = 'pending';

alter table public.templates
  add column if not exists category text,
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists preview_text text,
  add column if not exists design_preset text;

update public.templates
set preview_text = left(coalesce(body_template, ''), 180)
where preview_text is null;

alter table public.campaigns
  add column if not exists workflow_definition_jsonb jsonb not null default '{}'::jsonb;

alter table public.campaign_contacts
  add column if not exists current_node_key text,
  add column if not exists branch_history_jsonb jsonb not null default '[]'::jsonb,
  add column if not exists exit_reason text,
  add column if not exists reply_disposition text check (reply_disposition in ('negative', 'booked', 'positive', 'question', 'other')),
  add column if not exists meeting_booked_at timestamptz;

alter table public.campaign_contacts
  drop constraint if exists campaign_contacts_status_check;

alter table public.campaign_contacts
  add constraint campaign_contacts_status_check
  check (status in ('queued', 'sent', 'followup_due', 'followup_sent', 'replied', 'unsubscribed', 'failed', 'skipped', 'meeting_booked'));

alter table public.workspace_billing_accounts
  add column if not exists plan_key text,
  add column if not exists assigned_by_user_id uuid,
  add column if not exists assigned_at timestamptz,
  add column if not exists renewal_at timestamptz,
  add column if not exists usage_snapshot_jsonb jsonb not null default '{}'::jsonb;

alter table public.crm_connections
  add column if not exists provider_account_label text,
  add column if not exists sync_cursor_jsonb jsonb not null default '{}'::jsonb,
  add column if not exists field_mapping_jsonb jsonb not null default '{}'::jsonb,
  add column if not exists last_synced_at timestamptz;

create table if not exists public.crm_object_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  crm_connection_id uuid not null references public.crm_connections(id) on delete cascade,
  object_type text not null,
  external_object_id text not null,
  local_object_type text not null,
  local_object_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (crm_connection_id, object_type, external_object_id)
);

create table if not exists public.crm_sync_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  crm_connection_id uuid not null references public.crm_connections(id) on delete cascade,
  direction text not null check (direction in ('pull', 'push')),
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  imported_count integer not null default 0,
  exported_count integer not null default 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.message_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_contact_id uuid references public.campaign_contacts(id) on delete cascade,
  outbound_message_id uuid references public.outbound_messages(id) on delete cascade,
  gmail_message_id text,
  event_type text not null check (event_type in ('sent', 'opened', 'clicked', 'replied', 'unsubscribed', 'bounced', 'meeting_booked')),
  occurred_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists message_events_workspace_event_idx
  on public.message_events (workspace_id, event_type, occurred_at desc);

create table if not exists public.seed_inboxes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null,
  email_address text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'error')),
  folder_mapping_jsonb jsonb not null default '{}'::jsonb,
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, email_address)
);

create table if not exists public.seed_inbox_results (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  seed_inbox_id uuid not null references public.seed_inboxes(id) on delete cascade,
  probe_key text not null,
  provider text not null,
  folder_name text,
  placement_status text not null check (placement_status in ('inbox', 'primary', 'promotions', 'updates', 'spam', 'junk', 'missing')),
  observed_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists seed_inbox_results_workspace_idx
  on public.seed_inbox_results (workspace_id, observed_at desc);

create table if not exists public.system_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  check_key text not null,
  status text not null check (status in ('healthy', 'warning', 'error')),
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create trigger set_updated_at_crm_object_links before update on public.crm_object_links
for each row execute function public.set_updated_at();

create trigger set_updated_at_seed_inboxes before update on public.seed_inboxes
for each row execute function public.set_updated_at();

alter table public.crm_object_links enable row level security;
alter table public.crm_sync_runs enable row level security;
alter table public.message_events enable row level security;
alter table public.seed_inboxes enable row level security;
alter table public.seed_inbox_results enable row level security;
alter table public.system_health_snapshots enable row level security;

create policy "workspace members can access crm object links"
  on public.crm_object_links for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "workspace members can read crm sync runs"
  on public.crm_sync_runs for select
  using (public.is_workspace_member(workspace_id));

create policy "workspace admins can manage crm sync runs"
  on public.crm_sync_runs for all
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

create policy "workspace members can access message events"
  on public.message_events for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "workspace members can read seed inboxes"
  on public.seed_inboxes for select
  using (public.is_workspace_member(workspace_id));

create policy "workspace admins can manage seed inboxes"
  on public.seed_inboxes for all
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

create policy "workspace members can read seed inbox results"
  on public.seed_inbox_results for select
  using (public.is_workspace_member(workspace_id));

create policy "workspace admins can manage seed inbox results"
  on public.seed_inbox_results for all
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

create policy "workspace members can read system health snapshots"
  on public.system_health_snapshots for select
  using (workspace_id is null or public.is_workspace_member(workspace_id));

create policy "workspace admins can manage system health snapshots"
  on public.system_health_snapshots for all
  using (workspace_id is null or public.is_workspace_admin(workspace_id))
  with check (workspace_id is null or public.is_workspace_admin(workspace_id));

notify pgrst, 'reload schema';
