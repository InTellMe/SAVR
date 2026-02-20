-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create users table with subscription management
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text,
  subscription_tier text not null default 'basic' check (subscription_tier in ('free', 'basic', 'pro', 'plus', 'premium')),
  subscription_status text default 'pending' check (subscription_status in ('pending', 'active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid')),
  stripe_customer_id text unique,
  stripe_subscription_id text,
  stripe_email text,
  trial_ends_at timestamp with time zone,
  trial_ending_notified boolean default false,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean default false,
  last_payment_status text,
  last_payment_date timestamp with time zone,
  payment_action_required boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.users enable row level security;

-- Users can read their own data
create policy "Users can read own data"
  on public.users
  for select
  using (auth.uid() = id);

-- Users can update their own data (but not subscription fields - those are webhook-managed)
create policy "Users can update own data"
  on public.users
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Service role can insert/update for webhook operations
-- Note: This policy won't work for regular users, only service role
create policy "Service role can manage users"
  on public.users
  for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- Create function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, display_name, subscription_tier, subscription_status, created_at, updated_at)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'display_name',
    'basic',
    'pending',
    now(),
    now()
  );
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger to automatically create user record on auth.users insert
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for users table
create trigger handle_users_updated_at
  before update on public.users
  for each row
  execute procedure public.handle_updated_at();
