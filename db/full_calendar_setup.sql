-- Create calendar_events table if it doesn't exist
create table if not exists calendar_events (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  start_time timestamp with time zone not null,
  type text default 'work', -- 'work', 'personal', 'health'
  description text,
  user_id uuid references auth.users not null,
  location text,
  end_time timestamp with time zone,
  all_day boolean default false,
  repeat_frequency text default 'none',
  reminder_minutes integer,
  status text default 'busy',
  participants jsonb default '[]'::jsonb
);

-- Enable RLS
alter table calendar_events enable row level security;

-- Policies (using do block to avoid errors if they already exist)
do $$
begin
    if not exists (select 1 from pg_policies where policyname = 'Users can view their own events') then
        create policy "Users can view their own events" on calendar_events for select using (auth.uid() = user_id);
    end if;
    if not exists (select 1 from pg_policies where policyname = 'Users can insert their own events') then
        create policy "Users can insert their own events" on calendar_events for insert with check (auth.uid() = user_id);
    end if;
    if not exists (select 1 from pg_policies where policyname = 'Users can update their own events') then
        create policy "Users can update their own events" on calendar_events for update using (auth.uid() = user_id);
    end if;
    if not exists (select 1 from pg_policies where policyname = 'Users can delete their own events') then
        create policy "Users can delete their own events" on calendar_events for delete using (auth.uid() = user_id);
    end if;
end
$$;
