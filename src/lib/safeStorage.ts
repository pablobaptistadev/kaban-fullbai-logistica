/**
 * localStorage tolerante a falhas.
 *
 * No Safari em navegação privada (e com o armazenamento cheio ou bloqueado por
 * definições de privacidade) o `setItem` lança. Sem isto, uma gravação falhada
 * rebentava a meio do fluxo e as alterações seguintes perdiam-se sem aviso.
 */

let lastError: string | null = null;

/** Mensagem do último erro de escrita, ou null se está tudo bem. */
export function storageError(): string | null {
  return lastError;
}

export function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e);
    return null;
  }
}

/** Devolve true se gravou mesmo. */
export function writeLocal(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    lastError = null;
    return true;
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e);
    console.warn(
      `Não foi possível gravar "${key}" no armazenamento do browser.`,
      e
    );
    return false;
  }
}

export function removeLocal(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e);
  }
}

/** True se o browser deixa mesmo escrever (falso em navegação privada). */
export function isStorageWritable(): boolean {
  const probe = "__kanban_probe__";
  try {
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
