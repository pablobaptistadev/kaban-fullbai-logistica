import { supabase, supabaseConfigured } from "./supabase";
import type { Workspace } from "../types/kanban";

/**
 * O quadro é guardado por UTILIZADOR autenticado — uma linha por `user_id`,
 * não por browser. É isso que faz a sincronização entre dispositivos: entrar
 * com a mesma conta no telemóvel e no computador abre o mesmo quadro.
 *
 * (Antes a linha era identificada por um UUID aleatório gerado em cada
 * browser, por isso cada dispositivo via um quadro diferente.)
 */

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function activeSnapshot(w: Workspace) {
  const active = w.projects.find((p) => p.id === w.activeProjectId);
  return {
    board_title: active?.boardTitle ?? "Roadmap Logística",
    columns: active?.columns ?? [],
  };
}

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
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
    try {
      const userId = await currentUserId();
      // Sem sessão não há onde gravar; fica só o local até haver login.
      if (!userId) {
        onDone?.(null);
        return;
      }
      const legacy = activeSnapshot(workspace);
      const { error } = await client.from("kanban_board").upsert(
        {
          user_id: userId,
          board_title: legacy.board_title,
          columns: legacy.columns,
          theme_dark: themeDark,
          workspace,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      onDone?.(error ? new Error(error.message) : null);
    } catch (e) {
      onDone?.(e instanceof Error ? e : new Error(String(e)));
    }
  }, 750);
}

/**
 * Lê o quadro do utilizador autenticado.
 * `null` = sem sessão, ou o utilizador ainda não tem quadro guardado.
 */
export async function loadFromCloud(): Promise<{
  workspace: Workspace;
  themeDark: boolean;
} | null> {
  if (!supabaseConfigured || !supabase) return null;

  const userId = await currentUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from("kanban_board")
    .select("board_title, columns, theme_dark, workspace")
    .eq("user_id", userId)
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

  // Formato antigo: uma única lista de colunas.
  if (data.columns && Array.isArray(data.columns)) {
    const pid = crypto.randomUUID();
    const title = data.board_title ?? "Fluxo Logístico";
    return {
      workspace: {
        projects: [
          {
            id: pid,
            name: title,
            boardTitle: title,
            columns: data.columns as Workspace["projects"][0]["columns"],
          },
        ],
        activeProjectId: pid,
      },
      themeDark,
    };
  }

  return null;
}
