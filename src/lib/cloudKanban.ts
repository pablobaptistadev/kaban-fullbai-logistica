import { supabase, supabaseConfigured } from "./supabase";
import type { Column } from "../types/kanban";

export const DEVICE_ID_KEY = "kanban_cloud_device_id_v1";

export function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleSaveToCloud(
  columns: Column[],
  boardTitle: string,
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
    try {
      const { error } = await client.from("kanban_board").upsert(
        {
          id,
          board_title: boardTitle,
          columns,
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
  columns: Column[];
  boardTitle: string;
} | null> {
  if (!supabaseConfigured || !supabase) return null;

  const id = getOrCreateDeviceId();
  const { data, error } = await supabase
    .from("kanban_board")
    .select("board_title, columns")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data?.columns) return null;

  return {
    boardTitle: data.board_title ?? "Fluxo Logístico",
    columns: data.columns as Column[],
  };
}
