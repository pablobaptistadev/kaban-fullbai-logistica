import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./supabase";
import { clearLocalBoard } from "./workspaceStorage";

export type AuthState =
  | { status: "desligado" } // Supabase não configurado: app só local
  | { status: "a-verificar" }
  | { status: "fora" }
  | { status: "dentro"; session: Session };

/** Segue a sessão do Supabase e mantém-na sincronizada entre separadores. */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(
    supabaseConfigured ? { status: "a-verificar" } : { status: "desligado" }
  );

  useEffect(() => {
    if (!supabaseConfigured || !supabase) return;
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setState(
        data.session
          ? { status: "dentro", session: data.session }
          : { status: "fora" }
      );
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setState(session ? { status: "dentro", session } : { status: "fora" });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export type AuthResult = { ok: true; precisaConfirmarEmail: boolean } | {
  ok: false;
  erro: string;
};

export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  if (!supabase) return { ok: false, erro: "Supabase não configurado." };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, erro: traduzErro(error.message) };
  return { ok: true, precisaConfirmarEmail: false };
}

export async function signUp(
  email: string,
  password: string
): Promise<AuthResult> {
  if (!supabase) return { ok: false, erro: "Supabase não configurado." };
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { ok: false, erro: traduzErro(error.message) };
  // Sem sessão devolvida = o projeto exige confirmação por email.
  return { ok: true, precisaConfirmarEmail: !data.session };
}

export async function signOut(): Promise<void> {
  // Limpa a cópia local para que a conta seguinte não herde o quadro
  // de quem estava antes neste browser.
  clearLocalBoard();
  await supabase?.auth.signOut();
}

function traduzErro(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email ou password errados.";
  if (m.includes("email not confirmed"))
    return "Falta confirmar o email. Vê a tua caixa de entrada.";
  if (m.includes("user already registered"))
    return "Já existe uma conta com este email. Tenta entrar.";
  if (m.includes("password should be at least"))
    return "A password tem de ter pelo menos 6 caracteres.";
  if (m.includes("unable to validate email") || m.includes("invalid email"))
    return "Email inválido.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Demasiadas tentativas. Espera um pouco e tenta outra vez.";
  return msg;
}
