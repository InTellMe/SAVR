-- Create grocery_lists table
create table public.grocery_lists (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null,
  title text not null,
  items jsonb not null default '[]'::jsonb, -- Array of {name, quantity, unit, category, checked, notes}
  meal_plan_id uuid references public.meal_plans on delete set null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.grocery_lists enable row level security;

-- Users can only access their own grocery lists
create policy "Users can read own grocery_lists"
  on public.grocery_lists
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own grocery_lists"
  on public.grocery_lists
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own grocery_lists"
  on public.grocery_lists
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own grocery_lists"
  on public.grocery_lists
  for delete
  using (auth.uid() = user_id);

-- Create updated_at trigger
create trigger handle_grocery_lists_updated_at
  before update on public.grocery_lists
  for each row
  execute procedure public.handle_updated_at();

-- Create indexes
create index grocery_lists_user_id_idx on public.grocery_lists(user_id);
create index grocery_lists_meal_plan_id_idx on public.grocery_lists(meal_plan_id);
