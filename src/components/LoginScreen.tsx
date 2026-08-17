import React, { useState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { signIn, signUp } from "../lib/auth";

type Modo = "entrar" | "criar";

export default function LoginScreen({
  theme,
}: {
  theme: Record<string, string>;
}) {
  const [modo, setModo] = useState<Modo>("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    setAEnviar(true);
    const r =
      modo === "entrar"
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password);
    setAEnviar(false);

    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    if (r.precisaConfirmarEmail) {
      setAviso(
        "Conta criada. Confirma o email que te enviámos e depois entra aqui."
      );
      setModo("entrar");
    }
    // Com sessão, o onAuthStateChange troca o ecrã automaticamente.
  };

  return (
    <div
      className={`min-h-screen font-dm flex items-center justify-center p-6 ${theme.bg} ${theme.text}`}
    >
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">
          Roadmap
        </h1>
        <p className={`text-sm mb-8 ${theme.textMuted}`}>
          Entra para veres o teu quadro em qualquer dispositivo.
        </p>

        <form onSubmit={submeter} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={`text-xs font-medium ${theme.textMuted}`}>
              Email
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`rounded-xl px-3 py-2.5 text-sm border outline-none ${theme.inputBg} ${theme.cardBorder} ${theme.text}`}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={`text-xs font-medium ${theme.textMuted}`}>
              Password
            </span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={
                modo === "entrar" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`rounded-xl px-3 py-2.5 text-sm border outline-none ${theme.inputBg} ${theme.cardBorder} ${theme.text}`}
            />
          </label>

          {erro && (
            <p
              role="alert"
              className="text-[13px] text-red-500 bg-red-500/10 rounded-xl px-3 py-2"
            >
              {erro}
            </p>
          )}
          {aviso && (
            <p
              role="status"
              className={`text-[13px] rounded-xl px-3 py-2 ${theme.inputBg} ${theme.textMuted}`}
            >
              {aviso}
            </p>
          )}

          <button
            type="submit"
            disabled={aEnviar}
            className={`mt-2 flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium rounded-full transition-transform active:scale-95 disabled:opacity-60 ${theme.btnPrimary}`}
          >
            {aEnviar ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <LogIn size={16} />
            )}
            {modo === "entrar" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setModo(modo === "entrar" ? "criar" : "entrar");
            setErro(null);
            setAviso(null);
          }}
          className={`mt-5 text-[13px] underline underline-offset-4 ${theme.textMuted}`}
        >
          {modo === "entrar"
            ? "Ainda não tens conta? Criar uma."
            : "Já tens conta? Entrar."}
        </button>

        <p className={`mt-8 text-[11px] leading-relaxed ${theme.textMuted}`}>
          O teu quadro fica associado à tua conta e só tu lhe consegues
          aceder.
        </p>
      </div>
    </div>
  );
}
