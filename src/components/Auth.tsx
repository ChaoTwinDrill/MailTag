import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";

const campo =
  "w-full rounded-md bg-fundo p-3 text-white outline-none placeholder:text-white/40 focus:ring-2 focus:ring-botao-claro [color-scheme:dark]";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [modoCadastro, setModoCadastro] = useState(false);
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setCarregando(true);
    setMensagem(null);

    if (modoCadastro) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
      });

      if (error) {
        setMensagem({ texto: error.message, erro: true });
      } else if (!data.session) {
        setMensagem({ texto: "Cadastro realizado! Verifique seu e-mail.", erro: false });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) {
        setMensagem({ texto: error.message, erro: true });
      }
    }

    setCarregando(false);
  }

  return (
    <main className="flex h-screen items-center justify-center bg-fundo text-white">
      <form
        onSubmit={handleSubmit}
        className="m-4 flex w-full max-w-sm animate-pop flex-col gap-4 rounded-xl bg-base p-6 shadow-xl"
      >
        <div className="mb-2 text-center">
          <h1 className="font-Alexandria text-3xl font-[700] text-botao-claro">
            MailTag
          </h1>
          <p className="mt-1 text-sm text-gray-300">
            {modoCadastro ? "Criar conta" : "Entrar na sua galeria"}
          </p>
        </div>

        <label className="sr-only" htmlFor="auth-email">
          E-mail
        </label>
        <input
          id="auth-email"
          type="email"
          autoComplete="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={campo}
        />

        <label className="sr-only" htmlFor="auth-senha">
          Senha
        </label>
        <input
          id="auth-senha"
          type="password"
          autoComplete={modoCadastro ? "new-password" : "current-password"}
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          minLength={6}
          className={campo}
        />

        <button
          type="submit"
          disabled={carregando}
          className="rounded-md bg-botao-claro p-3 font-Alexandria font-[500] text-fundo transition hover:brightness-110 disabled:opacity-50"
        >
          {carregando ? "Aguarde..." : modoCadastro ? "Cadastrar" : "Entrar"}
        </button>

        {mensagem && (
          <p
            role="status"
            className={`text-center text-sm ${
              mensagem.erro ? "text-red-300" : "text-botao-claro"
            }`}
          >
            {mensagem.texto}
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            setModoCadastro(!modoCadastro);
            setMensagem(null);
          }}
          className="text-sm text-gray-300 transition hover:text-white"
        >
          {modoCadastro
            ? "Já tem uma conta? Entrar"
            : "Não tem uma conta? Criar conta"}
        </button>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-sm text-gray-400 transition hover:text-white"
        >
          Voltar
        </button>
      </form>
    </main>
  );
}