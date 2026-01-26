-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Table: tasks
create table tasks (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  category text not null, -- 'Trabalho', 'Pessoal', 'Projetos'
  priority text default 'medium', -- 'high', 'medium', 'low'
  completed boolean default false,
  user_id uuid references auth.users not null
);

-- Table: shopping_items
create table shopping_items (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  category text default 'Outros', -- 'Mercearia', 'Limpeza', etc.
  bought boolean default false,
  user_id uuid references auth.users not null
);

-- Table: transactions (Finance)
create table transactions (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  amount numeric not null,
  type text not null, -- 'income' or 'expense'
  date date default CURRENT_DATE,
  category text, 
  user_id uuid references auth.users not null
);

-- Table: calendar_events (Planning)
create table calendar_events (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  start_time timestamp with time zone not null,
  type text default 'work', -- 'work', 'personal', 'health'
  description text,
  user_id uuid references auth.users not null
);

-- Row Level Security (RLS) Policies
-- This ensures users only see their own data

alter table tasks enable row level security;
alter table shopping_items enable row level security;
alter table transactions enable row level security;
alter table calendar_events enable row level security;

-- Policies for TASKS
create policy "Users can view their own tasks" on tasks
  for select using (auth.uid() = user_id);

create policy "Users can insert their own tasks" on tasks
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own tasks" on tasks
  for update using (auth.uid() = user_id);

create policy "Users can delete their own tasks" on tasks
  for delete using (auth.uid() = user_id);

-- Policies for SHOPPING_ITEMS
create policy "Users can view their own shopping items" on shopping_items
  for select using (auth.uid() = user_id);

create policy "Users can insert their own shopping items" on shopping_items
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own shopping items" on shopping_items
  for update using (auth.uid() = user_id);

create policy "Users can delete their own shopping items" on shopping_items
  for delete using (auth.uid() = user_id);

-- Policies for TRANSACTIONS
create policy "Users can view their own transactions" on transactions
  for select using (auth.uid() = user_id);

create policy "Users can insert their own transactions" on transactions
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own transactions" on transactions
  for update using (auth.uid() = user_id);

create policy "Users can delete their own transactions" on transactions
  for delete using (auth.uid() = user_id);

-- Policies for CALENDAR_EVENTS
create policy "Users can view their own events" on calendar_events
  for select using (auth.uid() = user_id);

create policy "Users can insert their own events" on calendar_events
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own events" on calendar_events
  for update using (auth.uid() = user_id);

create policy "Users can delete their own events" on calendar_events
  for delete using (auth.uid() = user_id);
