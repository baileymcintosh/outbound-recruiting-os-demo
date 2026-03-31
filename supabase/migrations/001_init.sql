create extension if not exists "pgcrypto";

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  firm text,
  "group" text,
  role text,
  location text,
  school text,
  email text,
  email_confidence_score double precision,
  linkedin_url text,
  tags text[] default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.campaign_contacts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sent', 'replied', 'no_reply')),
  last_contacted_at timestamptz,
  follow_up_scheduled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (campaign_id, contact_id)
);

create table if not exists public.emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete cascade,
  campaign_contact_id uuid references public.campaign_contacts (id) on delete cascade,
  kind text not null default 'initial' check (kind in ('initial', 'follow_up')),
  subject text not null,
  body text not null,
  scheduled_send_time timestamptz not null,
  sent_at timestamptz,
  thread_id text,
  status text not null default 'scheduled' check (status in ('scheduled', 'sent', 'failed', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.gmail_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  email_address text,
  access_token text,
  refresh_token text,
  expiry_date bigint,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contacts_search_idx on public.contacts (firm, school, role);
create index if not exists contacts_email_idx on public.contacts (email);
create index if not exists campaign_contacts_campaign_idx on public.campaign_contacts (campaign_id, status);
create index if not exists emails_schedule_idx on public.emails (status, scheduled_send_time);

alter table public.contacts enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_contacts enable row level security;
alter table public.emails enable row level security;
alter table public.gmail_accounts enable row level security;

create policy "contacts are readable by authenticated users"
  on public.contacts for select
  to authenticated
  using (true);

create policy "users manage campaigns"
  on public.campaigns for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage campaign contacts through campaign ownership"
  on public.campaign_contacts for all
  to authenticated
  using (
    exists (
      select 1 from public.campaigns
      where campaigns.id = campaign_contacts.campaign_id
        and campaigns.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.campaigns
      where campaigns.id = campaign_contacts.campaign_id
        and campaigns.user_id = auth.uid()
    )
  );

create policy "users manage their emails"
  on public.emails for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage gmail accounts"
  on public.gmail_accounts for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists gmail_accounts_touch_updated_at on public.gmail_accounts;
create trigger gmail_accounts_touch_updated_at
before update on public.gmail_accounts
for each row execute procedure public.touch_updated_at();
