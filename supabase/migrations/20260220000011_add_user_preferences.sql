-- Add preferences column to users table
alter table public.users
  add column if not exists preferences jsonb default '{}'::jsonb;

-- Add comment for documentation
comment on column public.users.preferences is 'User preferences for cuisines, diets, restrictions, and additional notes';
