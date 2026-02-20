-- Create storage buckets for the application
-- This migration sets up three storage buckets with appropriate RLS policies

-- Create recipe-images bucket (public read, authenticated write to own folder)
insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true);

-- Create inventory-images bucket (private)
insert into storage.buckets (id, name, public)
values ('inventory-images', 'inventory-images', false);

-- Create labeling-images bucket (private, shared for ML dataset)
insert into storage.buckets (id, name, public)
values ('labeling-images', 'labeling-images', false);

-- Enable RLS on storage.objects
alter table storage.objects enable row level security;

-- Recipe Images Policies (Public bucket)
create policy "Public can view recipe images"
on storage.objects for select
to public
using (bucket_id = 'recipe-images');

create policy "Authenticated users can upload recipe images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'recipe-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update own recipe images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'recipe-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete own recipe images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'recipe-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Inventory Images Policies (Private bucket)
create policy "Users can upload own inventory images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'inventory-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can view own inventory images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'inventory-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update own inventory images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'inventory-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete own inventory images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'inventory-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Labeling Images Policies (Shared bucket for ML dataset)
create policy "Authenticated users can upload labeling images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'labeling-images');

create policy "Authenticated users can view labeling images"
on storage.objects for select
to authenticated
using (bucket_id = 'labeling-images');

create policy "Authenticated users can update labeling images"
on storage.objects for update
to authenticated
using (bucket_id = 'labeling-images');

create policy "Authenticated users can delete labeling images"
on storage.objects for delete
to authenticated
using (bucket_id = 'labeling-images');
