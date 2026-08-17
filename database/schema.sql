-- =============================================================================
-- Kanban Roadmap — esquema PostgreSQL (Supabase)
-- =============================================================================
-- O quadro é guardado POR UTILIZADOR autenticado: uma linha por user_id.
-- É isso que sincroniza entre dispositivos — entrar com a mesma conta no
-- telemóvel e no computador abre o mesmo quadro.
--
-- (Versões anteriores guardavam por browser, com um UUID aleatório gerado
-- em cada dispositivo. Nunca sincronizava: cada browser via um quadro seu.)
--
-- Aplicar: SQL Editor → New query → colar → Run.
-- =============================================================================

create table if not exists public.kanban_board (
  user_id uuid primary key references auth.users (id) on delete cascade,
  board_title text not null default 'Roadmap Logística',
  columns jsonb not null default '[]'::jsonb,
  theme_dark boolean not null default true,
  workspace jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.kanban_board is
  'Estado do quadro Kanban por utilizador autenticado (user_id = auth.users.id).';
comment on column public.kanban_board.workspace is
  'Vários projetos: { projects, activeProjectId }';

alter table public.kanban_board enable row level security;

-- Cada utilizador só lê e só escreve a sua própria linha.
-- Não há policy para `anon`: sem sessão não há acesso nenhum.
drop policy if exists "kanban_select_proprio" on public.kanban_board;
create policy "kanban_select_proprio"
  on public.kanban_board for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "kanban_insert_proprio" on public.kanban_board;
create policy "kanban_insert_proprio"
  on public.kanban_board for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "kanban_update_proprio" on public.kanban_board;
create policy "kanban_update_proprio"
  on public.kanban_board for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "kanban_delete_proprio" on public.kanban_board;
create policy "kanban_delete_proprio"
  on public.kanban_board for delete
  to authenticated
  using ((select auth.uid()) = user_id);
