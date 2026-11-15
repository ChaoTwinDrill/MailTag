import { useEffect, useRef, useState } from "react";
import { FaBook, FaBookmark, FaImages, FaSyncAlt, FaTimes } from "react-icons/fa";
import type { Colecao } from "../lib/colecoes";
import type { tags } from "./types/tag";
import { rotuloTermo } from "../lib/busca";

type ColecoesMenuProps = {
  colecoes: Colecao[];
  allTags: tags[];
  podeSalvar: boolean;
  onSalvar: (nome: string) => void;
  onAplicar: (colecao: Colecao) => void;
  onAtualizar: (id: string) => void;
  onExcluir: (id: string) => void;
};

export default function ColecoesMenu({
  colecoes,
  allTags,
  podeSalvar,
  onSalvar,
  onAplicar,
  onAtualizar,
  onExcluir,
}: ColecoesMenuProps) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;

    function aoClicar(e: MouseEvent) {
      if (raiz.current && !raiz.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }

    window.addEventListener("mousedown", aoClicar);
    window.addEventListener("keydown", aoTeclar);

    return () => {
      window.removeEventListener("mousedown", aoClicar);
      window.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  function resumo(c: Colecao) {
    const tagPorId = new Map(allTags.map((t) => [t.id, t]));
    const nomeDe = (id: string) => tagPorId.get(id)?.name;

    const partes = [
        ...c.buscaTagIds.map(nomeDe).filter((n): n is string => Boolean(n)),
        ...c.buscaExcluirIds
        .map(nomeDe)
        .filter((n): n is string => Boolean(n))
        .map((n) => `−${n}`),
        ...c.termos.map((t) => rotuloTermo(t, tagPorId)),
    ];

    return partes.length > 0 ? partes.join(", ") : "Só filtros";
    }

  function salvar() {
    const limpo = nome.trim();

    if (!limpo || !podeSalvar) return;

    onSalvar(limpo);
    setNome("");
  }

  return (
    <div ref={raiz} className="relative shrink-0">
        <button
            type="button"
            title="Coleções"
            aria-label="Coleções"
            aria-pressed={aberto}
            onClick={() => setAberto((a) => !a)}
            className="flex h-12 w-12 items-center justify-center rounded-lg bg-botao text-white transition hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-botao-claro aria-pressed:bg-botao-claro aria-pressed:text-fundo"
        >
            <FaBookmark className="h-5 w-5" />
        </button>

      {aberto && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-xl bg-fundo p-2 text-white shadow-xl">
          <div className="max-h-72 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {colecoes.length === 0 ? (
              <p className="p-3 text-center text-sm text-gray-400">
                Nenhuma coleção salva.
              </p>
            ) : (
              colecoes.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 rounded-md p-1.5 hover:bg-botao"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onAplicar(c);
                      setAberto(false);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    {c.modo === "livros" ? (
                      <FaBook className="shrink-0 text-gray-300" />
                    ) : (
                      <FaImages className="shrink-0 text-gray-300" />
                    )}

                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {c.nome}
                      </span>
                      <span className="block truncate text-xs text-gray-400">
                        {resumo(c)}
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    title="Atualizar com a busca atual"
                    disabled={!podeSalvar}
                    onClick={() => onAtualizar(c.id)}
                    className="shrink-0 text-gray-300 hover:text-white disabled:opacity-30"
                  >
                    <FaSyncAlt className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    title="Excluir coleção"
                    onClick={() => {
                      if (window.confirm(`Excluir a coleção "${c.nome}"?`)) {
                        onExcluir(c.id);
                      }
                    }}
                    className="shrink-0 text-red-400 hover:opacity-60"
                  >
                    <FaTimes className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="mt-2 flex gap-2 border-t border-border pt-2">
            <input
              value={nome}
              maxLength={40}
              autoComplete="off"
              placeholder="Nome da coleção..."
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  salvar();
                }
              }}
              className="min-w-0 flex-1 rounded-md bg-base p-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
            />

            <button
              type="button"
              disabled={!podeSalvar || !nome.trim()}
              onClick={salvar}
              className="shrink-0 rounded-md bg-botao-claro px-3 text-sm text-fundo hover:brightness-110 disabled:opacity-40"
            >
              Salvar
            </button>
          </div>

          {!podeSalvar && (
            <p className="mt-1 px-1 text-xs text-gray-400">
              Escolha tags, filtros ou uma ordenação para poder salvar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}