-- Create shared_recipes table for recipe sharing
create table public.shared_recipes (
  id uuid default uuid_generate_v4() primary key,
  share_id text unique not null,
  recipe_id uuid references public.recipes on delete cascade not null,
  user_id uuid references public.users on delete cascade not null,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.shared_recipes enable row level security;

-- Anyone can read shared recipes (if they have the share_id)
create policy "Anyone can read shared recipes"
  on public.shared_recipes
  for select
  using (true);

-- Users can only create shares for their own recipes
create policy "Users can create shares for own recipes"
  on public.shared_recipes
  for insert
  with check (auth.uid() = user_id);

-- Users can delete their own shares
create policy "Users can delete own shares"
  on public.shared_recipes
  for delete
  using (auth.uid() = user_id);

-- Create indexes
create index shared_recipes_share_id_idx on public.shared_recipes(share_id);
create index shared_recipes_recipe_id_idx on public.shared_recipes(recipe_id);
create index shared_recipes_user_id_idx on public.shared_recipes(user_id);
