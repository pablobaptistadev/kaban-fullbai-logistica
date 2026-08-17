import type { Workspace } from "../types/kanban";
import { createRoadmapLogisticaProject } from "../data/roadmapLogisticaSeed";
import { readLocal, removeLocal, writeLocal } from "./safeStorage";

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

/**
 * True se este browser já tem um quadro guardado. Serve para não enviar para
 * a nuvem um quadro-semente acabado de gerar: se um browser vazio entrasse
 * primeiro, carimbava a semente por cima do quadro real de outro dispositivo.
 */
export function hasLocalBoard(): boolean {
  return Boolean(readLocal(WORKSPACE_KEY) || readLocal(LEGACY_COL_KEY));
}

/** Migra formato antigo (uma lista de colunas) ou devolve default Roadmap. */
export function loadWorkspaceFromLocal(): Workspace {
  const raw = readLocal(WORKSPACE_KEY);
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

  const oldCols = readLocal(LEGACY_COL_KEY);
  const oldTitle =
    readLocal(LEGACY_TITLE_KEY)?.trim() || "Fluxo Logístico";
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

/** Devolve false se o browser recusou gravar (ex.: navegação privada). */
export function saveWorkspaceToLocal(w: Workspace): boolean {
  return writeLocal(WORKSPACE_KEY, JSON.stringify(w));
}

/**
 * Apaga a cópia local do quadro. Usado no logout, para que a conta seguinte
 * neste browser não herde o quadro de quem estava antes.
 */
export function clearLocalBoard(): void {
  removeLocal(WORKSPACE_KEY);
}
