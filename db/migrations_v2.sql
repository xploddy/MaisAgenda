-- Migration to enhance calendar_events table
alter table calendar_events add column if not exists location text;
alter table calendar_events add column if not exists end_time timestamp with time zone;
alter table calendar_events add column if not exists all_day boolean default false;
alter table calendar_events add column if not exists repeat_frequency text default 'none';
alter table calendar_events add column if not exists reminder_minutes integer;
alter table calendar_events add column if not exists status text default 'busy';
alter table calendar_events add column if not exists participants jsonb default '[]'::jsonb;

-- Ensure tasks and shopping_items have due_date (just in case they haven't been run yet)
alter table tasks add column if not exists due_date timestamp with time zone;
alter table shopping_items add column if not exists due_date timestamp with time zone;
