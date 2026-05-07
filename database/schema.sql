-- =============================================================================
-- Kanban Fullbai Logística — esquema PostgreSQL (ex.: Supabase SQL Editor)
-- =============================================================================
-- 1. Cria um projeto em https://supabase.com
-- 2. Em "SQL" → "New query" → cola este ficheiro → Run
-- 3. Em "Project Settings → API" copia URL e anon key para .env.local:
--    VITE_SUPABASE_URL=...
--    VITE_SUPABASE_ANON_KEY=...
--
-- Se já criaste a tabela antes sem theme_dark, executa também:
--   database/migration_theme_dark.sql
-- Políticas abaixo permitem leitura/escrita anónima: ok para demo; em produção
-- uses autenticação Supabase e políticas mais restritas.
-- =============================================================================

create table if not exists public.kanban_board (
  id uuid primary key,
  board_title text not null default 'Fluxo Logístico',
  columns jsonb not null default '[]'::jsonb,
  theme_dark boolean not null default true,
  updated_at timestamptz not null default now()
);

comment on table public.kanban_board is 'Estado do quadro Kanban por dispositivo (id = UUID do browser).';

create index if not exists kanban_board_updated_at_idx
  on public.kanban_board (updated_at desc);

alter table public.kanban_board enable row level security;

-- Demo: qualquer cliente com anon key pode criar/ler/atualizar qualquer linha.
-- Para produção: substituir por policies com auth.uid() ou desativar inserts públicos.
drop policy if exists "kanban_select_anon" on public.kanban_board;
create policy "kanban_select_anon"
  on public.kanban_board for select
  to anon, authenticated
  using (true);

drop policy if exists "kanban_insert_anon" on public.kanban_board;
create policy "kanban_insert_anon"
  on public.kanban_board for insert
  to anon, authenticated
  with check (true);

drop policy if exists "kanban_update_anon" on public.kanban_board;
create policy "kanban_update_anon"
  on public.kanban_board for update
  to anon, authenticated
  using (true)
  with check (true);
