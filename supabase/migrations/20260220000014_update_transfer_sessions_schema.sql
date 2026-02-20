-- Update transfer_sessions table to match current API usage
-- Add columns that are being used by the API but missing from original schema

-- Add user_id column (alias for from_user_id for backwards compatibility)
alter table public.transfer_sessions
  add column if not exists user_id uuid references public.users on delete cascade;

-- Add image_urls array column
alter table public.transfer_sessions
  add column if not exists image_urls text[] default '{}';

-- Update existing records to set user_id from from_user_id
update public.transfer_sessions
  set user_id = from_user_id
  where user_id is null;

-- Update RLS policies to also check user_id
drop policy if exists "Users can read own transfer sessions" on public.transfer_sessions;
create policy "Users can read own transfer sessions"
  on public.transfer_sessions
  for select
  using (
    auth.uid() = from_user_id 
    or auth.uid() = to_user_id 
    or auth.uid() = user_id
  );

drop policy if exists "Users can create transfer sessions" on public.transfer_sessions;
create policy "Users can create transfer sessions"
  on public.transfer_sessions
  for insert
  with check (
    auth.uid() = from_user_id 
    or auth.uid() = user_id
  );

drop policy if exists "Users can update own transfer sessions" on public.transfer_sessions;
create policy "Users can update own transfer sessions"
  on public.transfer_sessions
  for update
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

-- Add index for user_id
create index if not exists transfer_sessions_user_id_idx on public.transfer_sessions(user_id);
