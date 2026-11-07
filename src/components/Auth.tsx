
import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [modoCadastro, setModoCadastro] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setCarregando(true);
    setMensagem("");

    if (modoCadastro) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
      });

      if (error) {
        setMensagem(error.message);
      } else if (!data.session) {
        setMensagem("Cadastro realizado! Verifique seu e-mail.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) {
        setMensagem(error.message);
      }
    }

    setCarregando(false);
  }

  return (
    <main className="flex h-screen items-center justify-center bg-fundo text-white">
      <form
        onSubmit={handleSubmit}
        className="flex w-100 flex-col m-4 gap-4 rounded-xl bg-base p-6"
      >
        <h1 className="text-center text-2xl font-Alexandria">
          {modoCadastro ? "Criar conta" : "Entrar no MailTag"}
        </h1>

        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-md bg-card p-3 outline-none"
        />

        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          minLength={6}
          className="rounded-md bg-card p-3 outline-none"
        />

        <button
          type="submit"
          disabled={carregando}
          className="rounded-md bg-botao p-3 disabled:opacity-50"
        >
          {carregando
            ? "Aguarde..."
            : modoCadastro
              ? "Cadastrar"
              : "Entrar"}
        </button>

        <button
          type="button"
          onClick={() => {
            setModoCadastro(!modoCadastro);
            setMensagem("");
          }}
          className="text-sm text-gray-300"
        >
          {modoCadastro
            ? "Já tem uma conta? Entrar"
            : "Não tem uma conta? Criar conta"}
        </button>

        {mensagem && (
          <p className="text-center text-sm text-gray-300">
            {mensagem}
          </p>
        )}

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-sm text-gray-400"
        >
          Voltar
        </button>
      </form>
    </main>
  );
}
