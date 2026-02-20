-- Create chat_history table
create table public.chat_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.chat_history enable row level security;

-- Users can only access their own chat history
create policy "Users can read own chat_history"
  on public.chat_history
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own chat_history"
  on public.chat_history
  for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own chat_history"
  on public.chat_history
  for delete
  using (auth.uid() = user_id);

-- Create indexes
create index chat_history_user_id_created_at_idx on public.chat_history(user_id, created_at desc);
