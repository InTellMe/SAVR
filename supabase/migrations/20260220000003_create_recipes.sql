-- Create recipes table
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

-- Enable Row Level Security
alter table public.recipes enable row level security;

-- Users can only access their own recipes
create policy "Users can read own recipes"
  on public.recipes
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own recipes"
  on public.recipes
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own recipes"
  on public.recipes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own recipes"
  on public.recipes
  for delete
  using (auth.uid() = user_id);

-- Create updated_at trigger
create trigger handle_recipes_updated_at
  before update on public.recipes
  for each row
  execute procedure public.handle_updated_at();

-- Create indexes
create index recipes_user_id_idx on public.recipes(user_id);
create index recipes_is_favorite_idx on public.recipes(user_id, is_favorite) where is_favorite = true;
