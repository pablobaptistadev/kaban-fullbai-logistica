-- Se a tabela já existir sem a coluna workspace
alter table public.kanban_board
  add column if not exists workspace jsonb;

comment on column public.kanban_board.workspace is 'Vários projetos: { projects, activeProjectId }';
