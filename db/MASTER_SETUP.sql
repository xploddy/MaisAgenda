-- MASTER SETUP FOR +AGENDA
-- Este script cria TODO o bando de dados necessário do zero.
-- Copie tudo e cole no SQL Editor do seu Supabase.

-- 1. Habilitar extensões
create extension if not exists "uuid-ossp";

-- 2. Tabela de TAREFAS (Tasks)
create table if not exists tasks (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  category text default 'Trabalho',
  priority text default 'medium',
  completed boolean default false,
  due_date timestamp with time zone,
  user_id uuid references auth.users not null
);

-- 3. Tabela de COMPRAS (Shopping)
create table if not exists shopping_items (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  category text default 'Mercado',
  bought boolean default false,
  due_date timestamp with time zone,
  user_id uuid references auth.users not null
);

-- 4. Tabela de FINANCEIRO (Transactions)
create table if not exists transactions (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  amount numeric not null,
  type text not null, -- 'income' or 'expense'
  date date default CURRENT_DATE,
  category text, 
  user_id uuid references auth.users not null
);

-- 5. Tabela de PLANEJAMENTO (Calendar Events)
create table if not exists calendar_events (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone,
  all_day boolean default false,
  repeat_frequency text default 'none',
  reminder_minutes integer,
  status text default 'busy',
  description text,
  participants jsonb default '[]'::jsonb,
  type text default 'work',
  location text,
  user_id uuid references auth.users not null
);

-- 6. Tabela de PERFIL (Profiles)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  nickname text,
  theme text default 'light',
  default_account_id text,
  start_month_day text default '1'
);

-- 7. Configurar Segurança (RLS)
alter table tasks enable row level security;
alter table shopping_items enable row level security;
alter table transactions enable row level security;
alter table calendar_events enable row level security;
alter table profiles enable row level security;

-- 8. Criar Políticas de Acesso (Dando erro se já existir, usamos 'do' block)
do $$
begin
    -- Tarefas
    if not exists (select 1 from pg_policies where policyname = 'tasks_owner_policy') then
        create policy "tasks_owner_policy" on tasks for all using (auth.uid() = user_id);
    end if;
    -- Compras
    if not exists (select 1 from pg_policies where policyname = 'shopping_owner_policy') then
        create policy "shopping_owner_policy" on shopping_items for all using (auth.uid() = user_id);
    end if;
    -- Financeiro
    if not exists (select 1 from pg_policies where policyname = 'finance_owner_policy') then
        create policy "finance_owner_policy" on transactions for all using (auth.uid() = user_id);
    end if;
    -- Planejamento
    if not exists (select 1 from pg_policies where policyname = 'planning_owner_policy') then
        create policy "planning_owner_policy" on calendar_events for all using (auth.uid() = user_id);
    end if;
    -- Perfil
    if not exists (select 1 from pg_policies where policyname = 'profiles_owner_policy') then
        create policy "profiles_owner_policy" on profiles for all using (auth.uid() = id);
    end if;
end
$$;
