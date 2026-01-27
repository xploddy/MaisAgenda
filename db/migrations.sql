-- Add due_date to tasks
alter table tasks add column if not exists due_date timestamp with time zone;

-- Add due_date to shopping_items
alter table shopping_items add column if not exists due_date timestamp with time zone;
