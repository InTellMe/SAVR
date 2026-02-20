-- Create inventory table
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

-- Enable Row Level Security
alter table public.inventory enable row level security;

-- Users can only access their own inventory
create policy "Users can read own inventory"
  on public.inventory
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own inventory"
  on public.inventory
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own inventory"
  on public.inventory
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own inventory"
  on public.inventory
  for delete
  using (auth.uid() = user_id);

-- Create updated_at trigger
create trigger handle_inventory_updated_at
  before update on public.inventory
  for each row
  execute procedure public.handle_updated_at();

-- Create index for faster queries
create index inventory_user_id_idx on public.inventory(user_id);
create index inventory_expiry_date_idx on public.inventory(expiry_date);
