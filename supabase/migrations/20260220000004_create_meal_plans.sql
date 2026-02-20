-- Create meal_plans table
create table public.meal_plans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null,
  title text not null,
  description text,
  start_date date not null,
  end_date date not null,
  meals jsonb not null default '[]'::jsonb, -- Array of {date, meal_type, recipe_id, recipe_title}
  dietary_preferences jsonb default '[]'::jsonb,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.meal_plans enable row level security;

-- Users can only access their own meal plans
create policy "Users can read own meal_plans"
  on public.meal_plans
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own meal_plans"
  on public.meal_plans
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own meal_plans"
  on public.meal_plans
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own meal_plans"
  on public.meal_plans
  for delete
  using (auth.uid() = user_id);

-- Create updated_at trigger
create trigger handle_meal_plans_updated_at
  before update on public.meal_plans
  for each row
  execute procedure public.handle_updated_at();

-- Create indexes
create index meal_plans_user_id_idx on public.meal_plans(user_id);
create index meal_plans_date_range_idx on public.meal_plans(user_id, start_date, end_date);
