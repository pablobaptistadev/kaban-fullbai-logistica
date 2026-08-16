import { supabase, supabaseConfigured } from "./supabase";
import type { Workspace } from "../types/kanban";
import { defaultWorkspaceRoadmap } from "./workspaceStorage";
import { readLocal, writeLocal } from "./safeStorage";

export const DEVICE_ID_KEY = "kanban_cloud_device_id_v1";

export function getOrCreateDeviceId(): string {
  let id = readLocal(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    writeLocal(DEVICE_ID_KEY, id);
  }
  return id;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function activeSnapshot(w: Workspace) {
  const active = w.projects.find((p) => p.id === w.activeProjectId);
  return {
    board_title: active?.boardTitle ?? "Roadmap Logística",
    columns: active?.columns ?? [],
  };
}

export function scheduleSaveToCloud(
  workspace: Workspace,
  themeDark: boolean,
  onDone?: (err: Error | null) => void
): void {
  if (!supabaseConfigured || !supabase) {
    onDone?.(null);
    return;
  }

  const client = supabase;

  if (saveTimer) clearTimeout(saveTimer);

  saveTimer = setTimeout(async () => {
    saveTimer = null;
    const id = getOrCreateDeviceId();
    const legacy = activeSnapshot(workspace);
    try {
      const { error } = await client.from("kanban_board").upsert(
        {
          id,
          board_title: legacy.board_title,
          columns: legacy.columns,
          theme_dark: themeDark,
          workspace,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      onDone?.(error ? new Error(error.message) : null);
    } catch (e) {
      onDone?.(e instanceof Error ? e : new Error(String(e)));
    }
  }, 750);
}

export async function loadFromCloud(): Promise<{
  workspace: Workspace;
  themeDark: boolean;
} | null> {
  if (!supabaseConfigured || !supabase) return null;

  const id = getOrCreateDeviceId();
  const { data, error } = await supabase
    .from("kanban_board")
    .select("board_title, columns, theme_dark, workspace")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const themeDark = data.theme_dark !== false;

  const rawWs = data.workspace as Workspace | null | undefined;
  if (
    rawWs?.projects?.length &&
    rawWs.projects.some((p) => p.id === rawWs.activeProjectId)
  ) {
    return { workspace: rawWs, themeDark };
  }

  if (data.columns && Array.isArray(data.columns)) {
    const pid = crypto.randomUUID();
    const title = data.board_title ?? "Fluxo Logístico";
    const workspace: Workspace = {
      projects: [
        {
          id: pid,
          name: title,
          boardTitle: title,
          columns: data.columns as Workspace["projects"][0]["columns"],
        },
      ],
      activeProjectId: pid,
    };
    return { workspace, themeDark };
  }

  return { workspace: defaultWorkspaceRoadmap(), themeDark };
}
