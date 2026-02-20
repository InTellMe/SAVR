-- Create images table for ML dataset/labeling
create table public.images (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users on delete cascade,
  filename text not null,
  storage_path text not null unique,
  width integer,
  height integer,
  format text,
  size_bytes bigint,
  label_status text default 'unlabeled' check (label_status in ('unlabeled', 'in_progress', 'completed', 'verified')),
  category text,
  annotations jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  uploaded_by uuid references public.users on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.images enable row level security;

-- Users can read all images (for labeling tasks)
create policy "Users can read all images"
  on public.images
  for select
  using (auth.uid() is not null);

-- Users can insert images
create policy "Users can insert images"
  on public.images
  for insert
  with check (auth.uid() = uploaded_by);

-- Users can update images they uploaded or are assigned to
create policy "Users can update images"
  on public.images
  for update
  using (auth.uid() = uploaded_by or auth.uid() = user_id);

-- Create updated_at trigger
create trigger handle_images_updated_at
  before update on public.images
  for each row
  execute procedure public.handle_updated_at();

-- Create indexes
create index images_storage_path_idx on public.images(storage_path);
create index images_user_id_idx on public.images(user_id);
create index images_uploaded_by_idx on public.images(uploaded_by);
create index images_label_status_idx on public.images(label_status);
