-- Create categories table for ML dataset labeling
create table public.categories (
  id text primary key,
  name text not null,
  color text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.categories enable row level security;

-- Anyone authenticated can read categories
create policy "Users can read categories"
  on public.categories
  for select
  using (auth.uid() is not null);

-- Only authenticated users can insert categories
create policy "Users can insert categories"
  on public.categories
  for insert
  with check (auth.uid() is not null);

-- Create updated_at trigger
create trigger handle_categories_updated_at
  before update on public.categories
  for each row
  execute procedure public.handle_updated_at();

-- Create annotations table for ML dataset labeling
create table public.annotations (
  id uuid default uuid_generate_v4() primary key,
  image_id uuid references public.images on delete cascade not null,
  version integer not null default 1,
  source text not null check (source in ('ai', 'user')),
  parent_annotation_id uuid references public.annotations on delete set null,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected')),
  created_by_uid uuid references public.users on delete set null not null,
  objects jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(image_id, version)
);

-- Enable Row Level Security
alter table public.annotations enable row level security;

-- Users can read all annotations
create policy "Users can read annotations"
  on public.annotations
  for select
  using (auth.uid() is not null);

-- Users can insert annotations
create policy "Users can insert annotations"
  on public.annotations
  for insert
  with check (auth.uid() = created_by_uid);

-- Users can update their own annotations
create policy "Users can update annotations"
  on public.annotations
  for update
  using (auth.uid() = created_by_uid);

-- Create updated_at trigger
create trigger handle_annotations_updated_at
  before update on public.annotations
  for each row
  execute procedure public.handle_updated_at();

-- Create indexes
create index annotations_image_id_idx on public.annotations(image_id);
create index annotations_created_by_uid_idx on public.annotations(created_by_uid);
create index annotations_status_idx on public.annotations(status);
create index annotations_version_idx on public.annotations(image_id, version);

-- Update images table to support labeling workflow better
alter table public.images 
  add column if not exists source text default 'photo' check (source in ('photo', 'video_frame')),
  add column if not exists video_id text,
  add column if not exists frame_index integer,
  add column if not exists thumbnail_path text,
  add column if not exists current_annotation_id uuid references public.annotations on delete set null;

-- Update label_status enum to match expected values
alter table public.images drop constraint if exists images_label_status_check;
alter table public.images 
  add constraint images_label_status_check 
  check (label_status in ('unlabeled', 'in_review', 'ai_labeled', 'approved', 'rejected'));

-- Create index for current_annotation_id
create index if not exists images_current_annotation_id_idx on public.images(current_annotation_id);
