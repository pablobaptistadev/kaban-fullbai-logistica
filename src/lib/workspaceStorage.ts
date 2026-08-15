import type { Workspace } from "../types/kanban";
import { createRoadmapLogisticaProject } from "../data/roadmapLogisticaSeed";

export const WORKSPACE_KEY = "kanban_workspace_v1";

const LEGACY_COL_KEY = "kanban_logistica_v2";
const LEGACY_TITLE_KEY = "kanban_logistica_board_title_v1";

/** Projeto em branco (uma coluna) para iniciar rápido. */
export function createBlankProject() {
  const id = crypto.randomUUID();
  const boardTitle = "Novo projeto";
  return {
    id,
    name: boardTitle,
    boardTitle,
    columns: [
      {
        id: "col-" + Date.now(),
        title: "Nova coluna",
        cards: [],
      },
    ],
  };
}

export function defaultWorkspaceRoadmap(): Workspace {
  const p = createRoadmapLogisticaProject();
  return { projects: [p], activeProjectId: p.id };
}

/** Migra formato antigo (uma lista de colunas) ou devolve default Roadmap. */
export function loadWorkspaceFromLocal(): Workspace {
  const raw = localStorage.getItem(WORKSPACE_KEY);
  if (raw) {
    try {
      const w = JSON.parse(raw) as Workspace;
      if (
        w.projects?.length > 0 &&
        w.projects.some((p) => p.id === w.activeProjectId)
      ) {
        return w;
      }
    } catch {
      /* fallthrough */
    }
  }

  const oldCols = localStorage.getItem(LEGACY_COL_KEY);
  const oldTitle =
    localStorage.getItem(LEGACY_TITLE_KEY)?.trim() || "Fluxo Logístico";
  if (oldCols) {
    try {
      const columns = JSON.parse(oldCols);
      const id = crypto.randomUUID();
      return {
        projects: [
          {
            id,
            name: oldTitle,
            boardTitle: oldTitle,
            columns,
          },
        ],
        activeProjectId: id,
      };
    } catch {
      /* fallthrough */
    }
  }

  return defaultWorkspaceRoadmap();
}

export function saveWorkspaceToLocal(w: Workspace): void {
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(w));
}
