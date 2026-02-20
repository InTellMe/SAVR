-- Create transfer_sessions table for account data transfers
create table public.transfer_sessions (
  id uuid default uuid_generate_v4() primary key,
  token text unique not null,
  from_user_id uuid references public.users on delete cascade not null,
  to_user_id uuid references public.users on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'completed', 'expired', 'cancelled')),
  data_snapshot jsonb,
  expires_at timestamp with time zone not null,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.transfer_sessions enable row level security;

-- Users can read their own transfer sessions (as sender or receiver)
create policy "Users can read own transfer sessions"
  on public.transfer_sessions
  for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

-- Users can create transfer sessions
create policy "Users can create transfer sessions"
  on public.transfer_sessions
  for insert
  with check (auth.uid() = from_user_id);

-- Users can update their own transfer sessions
create policy "Users can update own transfer sessions"
  on public.transfer_sessions
  for update
  using (auth.uid() = from_user_id or auth.uid() = to_user_id)
  with check (auth.uid() = from_user_id or auth.uid() = to_user_id);

-- Create updated_at trigger
create trigger handle_transfer_sessions_updated_at
  before update on public.transfer_sessions
  for each row
  execute procedure public.handle_updated_at();

-- Create indexes
create index transfer_sessions_token_idx on public.transfer_sessions(token);
create index transfer_sessions_from_user_id_idx on public.transfer_sessions(from_user_id);
create index transfer_sessions_to_user_id_idx on public.transfer_sessions(to_user_id);
