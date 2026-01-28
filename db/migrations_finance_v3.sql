-- Migration for Enhanced Finance features
alter table transactions add column if not exists status text default 'paid'; -- 'paid' (liquidada), 'pending' (pendente)
alter table transactions add column if not exists recurring_group_id uuid; -- to group repeated launches
alter table transactions alter column type drop check; -- remove constraint to allow case difference if any, though we'll use consistent case
alter table transactions add constraint transactions_type_check check (type = ANY (ARRAY['income', 'expense', 'INCOME', 'EXPENSE']));
