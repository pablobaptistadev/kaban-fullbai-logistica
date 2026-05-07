-- Executa isto no SQL Editor do Supabase se a tabela já existir sem theme_dark
alter table public.kanban_board
  add column if not exists theme_dark boolean not null default true;
