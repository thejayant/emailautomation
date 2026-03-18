create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, user_id)
);

create table if not exists public.profiles (
  id uuid primary key,
  full_name text,
  title text,
  avatar_url text,
  primary_workspace_id uuid references public.workspaces(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workspace_billing_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  provider text,
  provider_customer_id text,
  status text not null default 'inactive',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.plan_limits (
  id uuid primary key default gen_random_uuid(),
  plan_key text not null unique,
  connected_mailboxes_limit integer not null default 1,
  daily_sends_limit integer not null default 50,
  active_campaigns_limit integer not null default 5,
  seats_limit integer not null default 5,
  crm_sync_enabled boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workspace_usage_counters (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  daily_sends_used integer not null default 0,
  active_campaigns_count integer not null default 0,
  connected_mailboxes_count integer not null default 0,
  seats_used integer not null default 1,
  period_start date not null default current_date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, period_start)
);

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  flag_key text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, flag_key)
);

create table if not exists public.oauth_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null,
  provider text not null,
  email_address text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expiry timestamptz,
  scopes text[] default '{}',
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, provider, email_address)
);

create table if not exists public.gmail_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null,
  oauth_connection_id uuid not null references public.oauth_connections(id) on delete cascade,
  email_address text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'error')),
  health_status text not null default 'active' check (health_status in ('active', 'needs_reauth', 'disconnected')),
  daily_send_count integer not null default 0,
  last_history_id text,
  last_synced_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, email_address)
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_user_id uuid,
  email text not null,
  first_name text,
  last_name text,
  company text,
  website text,
  job_title text,
  source text,
  external_source text,
  external_contact_id text,
  custom_fields_jsonb jsonb not null default '{}'::jsonb,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, external_source, external_contact_id)
);

create unique index if not exists contacts_workspace_email_unique
  on public.contacts (workspace_id, lower(email));

create table if not exists public.contact_lists (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_user_id uuid,
  name text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.contact_list_members (
  id uuid primary key default gen_random_uuid(),
  contact_list_id uuid not null references public.contact_lists(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (contact_list_id, contact_id)
);

create table if not exists public.imports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_user_id uuid,
  source_type text not null check (source_type in ('csv', 'xlsx', 'google_sheets', 'custom_crm')),
  file_name text,
  storage_path text,
  status text not null default 'uploaded' check (status in ('uploaded', 'mapped', 'processed', 'failed')),
  imported_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.imports(id) on delete cascade,
  row_number integer not null,
  raw_payload jsonb not null,
  mapped_payload jsonb,
  status text not null default 'pending' check (status in ('pending', 'imported', 'failed', 'skipped')),
  error_message text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.crm_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null,
  status text not null default 'placeholder',
  config_jsonb jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_user_id uuid,
  name text not null,
  subject_template text not null,
  body_template text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_user_id uuid,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed')),
  gmail_account_id uuid not null references public.gmail_accounts(id) on delete restrict,
  daily_send_limit integer not null default 25,
  send_window_start time not null default '09:00',
  send_window_end time not null default '17:00',
  timezone text not null default 'UTC',
  allowed_send_days text[] default array['Mon','Tue','Wed','Thu','Fri']::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.campaign_steps (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  step_number integer not null check (step_number between 1 and 2),
  step_type text not null check (step_type in ('initial', 'follow_up')),
  subject_template text not null,
  body_template text not null,
  wait_days integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (campaign_id, step_number)
);

create table if not exists public.campaign_contacts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  status text not null check (status in ('queued', 'sent', 'followup_due', 'followup_sent', 'replied', 'unsubscribed', 'failed', 'skipped')),
  current_step integer not null default 1,
  next_due_at timestamptz,
  replied_at timestamptz,
  last_thread_id text,
  last_message_id text,
  last_synced_at timestamptz,
  failed_attempts integer not null default 0,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (campaign_id, contact_id)
);

create index if not exists campaign_contacts_due_idx
  on public.campaign_contacts (status, next_due_at);

create table if not exists public.outbound_messages (
  id uuid primary key default gen_random_uuid(),
  campaign_contact_id uuid not null references public.campaign_contacts(id) on delete cascade,
  gmail_message_id text,
  gmail_thread_id text,
  step_number integer not null,
  sent_at timestamptz,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (campaign_contact_id, step_number)
);

create table if not exists public.message_threads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_contact_id uuid references public.campaign_contacts(id) on delete set null,
  gmail_thread_id text not null unique,
  subject text,
  snippet text,
  latest_message_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.thread_messages (
  id uuid primary key default gen_random_uuid(),
  gmail_thread_id text not null references public.message_threads(gmail_thread_id) on delete cascade,
  gmail_message_id text not null unique,
  direction text not null check (direction in ('outbound', 'inbound')),
  from_email text,
  to_emails text[] default '{}',
  subject text,
  snippet text,
  body_text text,
  body_html text,
  headers_jsonb jsonb not null default '{}'::jsonb,
  sent_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists thread_messages_thread_sent_idx
  on public.thread_messages (gmail_thread_id, sent_at desc);

create table if not exists public.unsubscribes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  reason text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed')),
  requested_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create index if not exists gmail_accounts_workspace_idx on public.gmail_accounts (workspace_id, status);
create index if not exists campaigns_workspace_status_idx on public.campaigns (workspace_id, status);
create index if not exists contacts_workspace_idx on public.contacts (workspace_id);
create index if not exists imports_workspace_idx on public.imports (workspace_id, created_at desc);
create index if not exists activity_logs_workspace_idx on public.activity_logs (workspace_id, created_at desc);

create trigger set_updated_at_workspaces before update on public.workspaces
for each row execute function public.set_updated_at();
create trigger set_updated_at_profiles before update on public.profiles
for each row execute function public.set_updated_at();
create trigger set_updated_at_billing before update on public.workspace_billing_accounts
for each row execute function public.set_updated_at();
create trigger set_updated_at_usage before update on public.workspace_usage_counters
for each row execute function public.set_updated_at();
create trigger set_updated_at_oauth before update on public.oauth_connections
for each row execute function public.set_updated_at();
create trigger set_updated_at_gmail before update on public.gmail_accounts
for each row execute function public.set_updated_at();
create trigger set_updated_at_contacts before update on public.contacts
for each row execute function public.set_updated_at();
create trigger set_updated_at_contact_lists before update on public.contact_lists
for each row execute function public.set_updated_at();
create trigger set_updated_at_imports before update on public.imports
for each row execute function public.set_updated_at();
create trigger set_updated_at_crm before update on public.crm_connections
for each row execute function public.set_updated_at();
create trigger set_updated_at_templates before update on public.templates
for each row execute function public.set_updated_at();
create trigger set_updated_at_campaigns before update on public.campaigns
for each row execute function public.set_updated_at();
create trigger set_updated_at_campaign_contacts before update on public.campaign_contacts
for each row execute function public.set_updated_at();
create trigger set_updated_at_message_threads before update on public.message_threads
for each row execute function public.set_updated_at();

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(target_workspace_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace_id uuid;
  base_name text;
begin
  base_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'New User');

  insert into public.workspaces (name, slug)
  values (
    base_name || ' Workspace',
    lower(regexp_replace(base_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(new.id::text, 1, 8)
  )
  returning id into new_workspace_id;

  insert into public.profiles (id, full_name, primary_workspace_id)
  values (new.id, base_name, new_workspace_id);

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner');

  insert into public.workspace_usage_counters (workspace_id)
  values (new_workspace_id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.plan_limits (plan_key, connected_mailboxes_limit, daily_sends_limit, active_campaigns_limit, seats_limit, crm_sync_enabled)
values
  ('internal_mvp', 5, 250, 25, 15, false)
on conflict (plan_key) do nothing;

insert into storage.buckets (id, name, public)
values ('imports', 'imports', false)
on conflict (id) do nothing;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.profiles enable row level security;
alter table public.workspace_billing_accounts enable row level security;
alter table public.plan_limits enable row level security;
alter table public.workspace_usage_counters enable row level security;
alter table public.feature_flags enable row level security;
alter table public.oauth_connections enable row level security;
alter table public.gmail_accounts enable row level security;
alter table public.contacts enable row level security;
alter table public.contact_lists enable row level security;
alter table public.contact_list_members enable row level security;
alter table public.imports enable row level security;
alter table public.import_rows enable row level security;
alter table public.crm_connections enable row level security;
alter table public.templates enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_steps enable row level security;
alter table public.campaign_contacts enable row level security;
alter table public.outbound_messages enable row level security;
alter table public.message_threads enable row level security;
alter table public.thread_messages enable row level security;
alter table public.unsubscribes enable row level security;
alter table public.activity_logs enable row level security;
alter table public.deletion_requests enable row level security;

create policy "profiles are self readable"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles are self updatable"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles are self insertable"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "workspace members can read workspaces"
  on public.workspaces for select
  using (public.is_workspace_member(id));

create policy "workspace admins can update workspaces"
  on public.workspaces for update
  using (public.is_workspace_admin(id))
  with check (public.is_workspace_admin(id));

create policy "workspace members can read membership"
  on public.workspace_members for select
  using (public.is_workspace_member(workspace_id));

create policy "workspace admins can manage membership"
  on public.workspace_members for all
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

create policy "workspace admins can read billing"
  on public.workspace_billing_accounts for select
  using (public.is_workspace_admin(workspace_id));

create policy "workspace admins can manage billing"
  on public.workspace_billing_accounts for all
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

create policy "workspace members can read usage counters"
  on public.workspace_usage_counters for select
  using (public.is_workspace_member(workspace_id));

create policy "workspace admins can manage usage counters"
  on public.workspace_usage_counters for all
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

create policy "workspace members can read feature flags"
  on public.feature_flags for select
  using (workspace_id is null or public.is_workspace_member(workspace_id));

create policy "workspace admins can manage feature flags"
  on public.feature_flags for all
  using (workspace_id is null or public.is_workspace_admin(workspace_id))
  with check (workspace_id is null or public.is_workspace_admin(workspace_id));

create policy "workspace members can read gmail accounts"
  on public.gmail_accounts for select
  using (public.is_workspace_member(workspace_id));

create policy "workspace admins can manage gmail accounts"
  on public.gmail_accounts for all
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

create policy "workspace members can access contacts"
  on public.contacts for select
  using (public.is_workspace_member(workspace_id));

create policy "workspace members can manage contacts"
  on public.contacts for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "workspace members can access contact lists"
  on public.contact_lists for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "workspace members can access contact list members"
  on public.contact_list_members for all
  using (
    exists (
      select 1 from public.contact_lists
      where id = contact_list_members.contact_list_id
        and public.is_workspace_member(workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.contact_lists
      where id = contact_list_members.contact_list_id
        and public.is_workspace_member(workspace_id)
    )
  );

create policy "workspace members can access imports"
  on public.imports for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "workspace members can access import rows"
  on public.import_rows for all
  using (
    exists (
      select 1 from public.imports
      where id = import_rows.import_id
        and public.is_workspace_member(workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.imports
      where id = import_rows.import_id
        and public.is_workspace_member(workspace_id)
    )
  );

create policy "workspace members can read crm connections"
  on public.crm_connections for select
  using (public.is_workspace_member(workspace_id));

create policy "workspace admins can manage crm connections"
  on public.crm_connections for all
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

create policy "workspace members can access templates"
  on public.templates for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "workspace members can access campaigns"
  on public.campaigns for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "workspace members can access campaign steps"
  on public.campaign_steps for all
  using (
    exists (
      select 1 from public.campaigns
      where id = campaign_steps.campaign_id
        and public.is_workspace_member(workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.campaigns
      where id = campaign_steps.campaign_id
        and public.is_workspace_member(workspace_id)
    )
  );

create policy "workspace members can access campaign contacts"
  on public.campaign_contacts for all
  using (
    exists (
      select 1 from public.campaigns
      where id = campaign_contacts.campaign_id
        and public.is_workspace_member(workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.campaigns
      where id = campaign_contacts.campaign_id
        and public.is_workspace_member(workspace_id)
    )
  );

create policy "workspace members can access outbound messages"
  on public.outbound_messages for all
  using (
    exists (
      select 1 from public.campaign_contacts cc
      join public.campaigns c on c.id = cc.campaign_id
      where cc.id = outbound_messages.campaign_contact_id
        and public.is_workspace_member(c.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.campaign_contacts cc
      join public.campaigns c on c.id = cc.campaign_id
      where cc.id = outbound_messages.campaign_contact_id
        and public.is_workspace_member(c.workspace_id)
    )
  );

create policy "workspace members can access message threads"
  on public.message_threads for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "workspace members can access thread messages"
  on public.thread_messages for all
  using (
    exists (
      select 1 from public.message_threads
      where gmail_thread_id = thread_messages.gmail_thread_id
        and public.is_workspace_member(workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.message_threads
      where gmail_thread_id = thread_messages.gmail_thread_id
        and public.is_workspace_member(workspace_id)
    )
  );

create policy "workspace members can access unsubscribes"
  on public.unsubscribes for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "workspace members can access activity logs"
  on public.activity_logs for select
  using (public.is_workspace_member(workspace_id));

create policy "workspace members can create activity logs"
  on public.activity_logs for insert
  with check (public.is_workspace_member(workspace_id));

create policy "workspace admins can access deletion requests"
  on public.deletion_requests for all
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

create policy "authenticated users can read plan limits"
  on public.plan_limits for select
  using (auth.role() = 'authenticated');

create policy "workspace members can upload import files"
  on storage.objects for insert
  with check (
    bucket_id = 'imports'
    and auth.role() = 'authenticated'
  );

create policy "workspace members can read import files"
  on storage.objects for select
  using (
    bucket_id = 'imports'
    and auth.role() = 'authenticated'
  );

notify pgrst, 'reload schema';
