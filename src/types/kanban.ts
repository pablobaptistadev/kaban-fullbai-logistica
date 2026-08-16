/**
 * Campos de desativação. São opcionais para manter compatibilidade com os
 * quadros já guardados em localStorage/Supabase antes desta funcionalidade:
 * um item sem `disabled` conta como ativo.
 */
export type Disableable = {
  disabled?: boolean;
  /** ISO 8601 do momento em que foi desativado. */
  disabledAt?: string;
};

export type Card = Disableable & {
  id: string;
  title: string;
  content: string;
};

export type Column = Disableable & {
  id: string;
  title: string;
  cards: Card[];
};

/** Um quadro Kanban nomeado (projeto). */
export type KanbanProject = Disableable & {
  id: string;
  name: string;
  boardTitle: string;
  columns: Column[];
};

/** Vários projetos + qual está ativo no UI. */
export type Workspace = {
  projects: KanbanProject[];
  activeProjectId: string;
};

/** Um item sem `disabled` (dados antigos) conta como ativo. */
export const isActive = (x: Disableable): boolean => x.disabled !== true;
