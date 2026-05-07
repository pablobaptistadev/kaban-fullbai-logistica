export type Card = {
  id: string;
  title: string;
  content: string;
};

export type Column = {
  id: string;
  title: string;
  cards: Card[];
};

/** Um quadro Kanban nomeado (projeto). */
export type KanbanProject = {
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
