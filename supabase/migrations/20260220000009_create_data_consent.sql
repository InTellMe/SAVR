-- Create data_consent table for GDPR/privacy compliance
create table public.data_consent (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null unique,
  marketing_emails boolean default false,
  data_usage_for_training boolean default false,
  analytics_tracking boolean default true,
  consent_version text not null,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.data_consent enable row level security;

-- Users can read their own consent
create policy "Users can read own consent"
  on public.data_consent
  for select
  using (auth.uid() = user_id);

-- Users can insert their own consent
create policy "Users can insert own consent"
  on public.data_consent
  for insert
  with check (auth.uid() = user_id);

-- Users can update their own consent
create policy "Users can update own consent"
  on public.data_consent
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Create updated_at trigger
create trigger handle_data_consent_updated_at
  before update on public.data_consent
  for each row
  execute procedure public.handle_updated_at();

-- Create index
create index data_consent_user_id_idx on public.data_consent(user_id);
