-- SAVR Initial Database Schema
-- This single migration sets up the complete database schema for the SAVR application.
-- Run this in the Supabase SQL Editor to initialize your database.

-- ============================================================
-- Extensions
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- Helper Functions
-- ============================================================

-- Automatically update the updated_at column on row modification
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- Users Table
-- ============================================================

create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text,
  preferences jsonb default '{}'::jsonb,
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

comment on column public.users.preferences is 'User preferences for cuisines, diets, restrictions, and additional notes';

alter table public.users enable row level security;

create policy "Users can read own data"
  on public.users
  for select
  using (auth.uid() = id);

create policy "Users can update own data"
  on public.users
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Service role policy for webhook operations (Stripe, etc.)
create policy "Service role can manage users"
  on public.users
  for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- Automatically create a user profile record when a new auth user signs up
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create trigger handle_users_updated_at
  before update on public.users
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- Inventory Table
-- ============================================================

create table public.inventory (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users on delete cascade not null,
  name text not null,
  quantity numeric,
  unit text,
  category text,
  location text,
  expiry_date timestamp with time zone,
  image_url text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.inventory enable row level security;

create policy "Users can read own inventory"
  on public.inventory for select
  using (auth.uid() = user_id);

create policy "Users can insert own inventory"
  on public.inventory for insert
  with check (auth.uid() = user_id);

create policy "Users can update own inventory"
  on public.inventory for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own inventory"
  on public.inventory for delete
  using (auth.uid() = user_id);

create trigger handle_inventory_updated_at
  before update on public.inventory
  for each row execute procedure public.handle_updated_at();

create index inventory_user_id_idx on public.inventory(user_id);
create index inventory_expiry_date_idx on public.inventory(expiry_date);

-- ============================================================
-- Recipes Table
-- ============================================================

create table public.recipes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users on delete cascade not null,
  title text not null,
  description text,
  ingredients jsonb not null default '[]'::jsonb,
  instructions jsonb not null default '[]'::jsonb,
  prep_time_minutes integer,
  cook_time_minutes integer,
  servings integer,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  cuisine text,
  dietary_tags jsonb default '[]'::jsonb,
  nutritional_info jsonb,
  image_url text,
  source_url text,
  is_ai_generated boolean default false,
  is_favorite boolean default false,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.recipes enable row level security;

create policy "Users can read own recipes"
  on public.recipes for select
  using (auth.uid() = user_id);

create policy "Users can insert own recipes"
  on public.recipes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own recipes"
  on public.recipes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own recipes"
  on public.recipes for delete
  using (auth.uid() = user_id);

create trigger handle_recipes_updated_at
  before update on public.recipes
  for each row execute procedure public.handle_updated_at();

create index recipes_user_id_idx on public.recipes(user_id);
create index recipes_is_favorite_idx on public.recipes(user_id, is_favorite) where is_favorite = true;

-- ============================================================
-- Meal Plans Table
-- ============================================================

create table public.meal_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users on delete cascade not null,
  title text not null,
  description text,
  start_date date not null,
  end_date date not null,
  meals jsonb not null default '[]'::jsonb,
  dietary_preferences jsonb default '[]'::jsonb,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.meal_plans enable row level security;

create policy "Users can read own meal_plans"
  on public.meal_plans for select
  using (auth.uid() = user_id);

create policy "Users can insert own meal_plans"
  on public.meal_plans for insert
  with check (auth.uid() = user_id);

create policy "Users can update own meal_plans"
  on public.meal_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own meal_plans"
  on public.meal_plans for delete
  using (auth.uid() = user_id);

create trigger handle_meal_plans_updated_at
  before update on public.meal_plans
  for each row execute procedure public.handle_updated_at();

create index meal_plans_user_id_idx on public.meal_plans(user_id);
create index meal_plans_date_range_idx on public.meal_plans(user_id, start_date, end_date);

-- ============================================================
-- Grocery Lists Table
-- ============================================================

create table public.grocery_lists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users on delete cascade not null,
  title text not null,
  items jsonb not null default '[]'::jsonb,
  meal_plan_id uuid references public.meal_plans on delete set null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.grocery_lists enable row level security;

create policy "Users can read own grocery_lists"
  on public.grocery_lists for select
  using (auth.uid() = user_id);

create policy "Users can insert own grocery_lists"
  on public.grocery_lists for insert
  with check (auth.uid() = user_id);

create policy "Users can update own grocery_lists"
  on public.grocery_lists for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own grocery_lists"
  on public.grocery_lists for delete
  using (auth.uid() = user_id);

create trigger handle_grocery_lists_updated_at
  before update on public.grocery_lists
  for each row execute procedure public.handle_updated_at();

create index grocery_lists_user_id_idx on public.grocery_lists(user_id);
create index grocery_lists_meal_plan_id_idx on public.grocery_lists(meal_plan_id);

-- ============================================================
-- Chat History Table
-- ============================================================

create table public.chat_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.chat_history enable row level security;

create policy "Users can read own chat_history"
  on public.chat_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own chat_history"
  on public.chat_history for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own chat_history"
  on public.chat_history for delete
  using (auth.uid() = user_id);

create index chat_history_user_id_created_at_idx on public.chat_history(user_id, created_at desc);

-- ============================================================
-- Shared Recipes Table
-- ============================================================

create table public.shared_recipes (
  id uuid default gen_random_uuid() primary key,
  share_id text unique not null,
  recipe_id uuid references public.recipes on delete cascade not null,
  user_id uuid references public.users on delete cascade not null,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.shared_recipes enable row level security;

-- Anyone can look up a shared recipe by share_id
create policy "Anyone can read shared recipes"
  on public.shared_recipes for select
  using (true);

create policy "Users can create shares for own recipes"
  on public.shared_recipes for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own shares"
  on public.shared_recipes for delete
  using (auth.uid() = user_id);

create index shared_recipes_share_id_idx on public.shared_recipes(share_id);
create index shared_recipes_recipe_id_idx on public.shared_recipes(recipe_id);
create index shared_recipes_user_id_idx on public.shared_recipes(user_id);

-- ============================================================
-- Transfer Sessions Table
-- ============================================================

create table public.transfer_sessions (
  id uuid default gen_random_uuid() primary key,
  token text unique not null,
  from_user_id uuid references public.users on delete cascade not null,
  user_id uuid references public.users on delete cascade,
  to_user_id uuid references public.users on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'completed', 'expired', 'cancelled')),
  data_snapshot jsonb,
  image_urls text[] default '{}',
  expires_at timestamp with time zone not null,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.transfer_sessions enable row level security;

create policy "Users can read own transfer sessions"
  on public.transfer_sessions for select
  using (
    auth.uid() = from_user_id
    or auth.uid() = to_user_id
    or auth.uid() = user_id
  );

create policy "Users can create transfer sessions"
  on public.transfer_sessions for insert
  with check (
    auth.uid() = from_user_id
    or auth.uid() = user_id
  );

create policy "Users can update own transfer sessions"
  on public.transfer_sessions for update
  using (
    auth.uid() = from_user_id
    or auth.uid() = to_user_id
    or auth.uid() = user_id
  )
  with check (
    auth.uid() = from_user_id
    or auth.uid() = to_user_id
    or auth.uid() = user_id
  );

create trigger handle_transfer_sessions_updated_at
  before update on public.transfer_sessions
  for each row execute procedure public.handle_updated_at();

create index transfer_sessions_token_idx on public.transfer_sessions(token);
create index transfer_sessions_from_user_id_idx on public.transfer_sessions(from_user_id);
create index transfer_sessions_user_id_idx on public.transfer_sessions(user_id);
create index transfer_sessions_to_user_id_idx on public.transfer_sessions(to_user_id);

-- ============================================================
-- Data Consent Table
-- ============================================================

create table public.data_consent (
  id uuid default gen_random_uuid() primary key,
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

alter table public.data_consent enable row level security;

create policy "Users can read own consent"
  on public.data_consent for select
  using (auth.uid() = user_id);

create policy "Users can insert own consent"
  on public.data_consent for insert
  with check (auth.uid() = user_id);

create policy "Users can update own consent"
  on public.data_consent for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger handle_data_consent_updated_at
  before update on public.data_consent
  for each row execute procedure public.handle_updated_at();

create index data_consent_user_id_idx on public.data_consent(user_id);

-- ============================================================
-- Storage Buckets
-- ============================================================

-- recipe-images: public read, users write to their own folder
insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true);

-- inventory-images: private, users access their own folder only
insert into storage.buckets (id, name, public)
values ('inventory-images', 'inventory-images', false);

-- Recipe Images Policies
create policy "Public can view recipe images"
  on storage.objects for select
  to public
  using (bucket_id = 'recipe-images');

create policy "Authenticated users can upload recipe images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'recipe-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own recipe images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'recipe-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own recipe images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'recipe-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Inventory Images Policies
create policy "Users can upload own inventory images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'inventory-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can view own inventory images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'inventory-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own inventory images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'inventory-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own inventory images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'inventory-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
