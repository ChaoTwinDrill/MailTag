import { useEffect, type ReactNode, useState } from "react";
import { FaTimes } from "react-icons/fa";
import type { tags } from "./types/tag";

import {
  FILTROS_LIVROS_PADRAO,
  type FiltrosLivros,
} from "../lib/bookFilters";

type BookFilterPanelProps = {
  aberto: boolean;
  filtros: FiltrosLivros;
  onChange: (filtros: FiltrosLivros) => void;
  totalLivros: number;
  totalFiltrados: number;
  onClose: () => void;
  todasTags: tags[];
};

const classeCampo =
  "w-full rounded-md bg-fundo p-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 [color-scheme:dark]";

function ExcluirTags({
  todasTags,
  selecionadas,
  onChange,
}: {
  todasTags: tags[];
  selecionadas: string[];
  onChange: (ids: string[]) => void;
}) {
  const [texto, setTexto] = useState("");
  const busca = texto.trim().toLowerCase();

  const sugestoes = busca
    ? todasTags
        .filter(
          (t) =>
            !selecionadas.includes(t.id) &&
            t.name.toLowerCase().includes(busca)
        )
        .slice(0, 20)
    : [];

  function adicionar(id: string) {
    onChange([...selecionadas, id]);
    setTexto("");
  }

  const estilo = (t: tags) => ({
    backgroundColor: t.color ?? "#555555",
    color: t.textColor ?? "#ffffff",
    border: t.hasBorder
      ? `2px solid ${t.borderColor ?? "#ffffff"}`
      : "none",
  });

  return (
    <div className="mt-4">
      <p className="mb-1 text-xs text-gray-300">
        Ocultar livros que tenham estas tags:
      </p>

      {selecionadas.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selecionadas.map((id) => {
            const tag = todasTags.find((t) => t.id === id);
            if (!tag) return null;

            return (
              <span
                key={id}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold"
                style={estilo(tag)}
              >
                {tag.name}

                <button
                  type="button"
                  title="Parar de ocultar"
                  className="hover:opacity-60"
                  onClick={() =>
                    onChange(selecionadas.filter((s) => s !== id))
                  }
                >
                  <FaTimes />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <input
        type="text"
        autoComplete="off"
        placeholder="Digite uma tag..."
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();

          const exata = sugestoes.find(
            (t) => t.name.toLowerCase() === busca
          );

          const escolhida =
            exata ?? (sugestoes.length === 1 ? sugestoes[0] : null);

          if (escolhida) adicionar(escolhida.id);
        }}
        className={classeCampo}
      />

      {sugestoes.length > 0 && (
        <div className="mt-2 flex max-h-32 flex-wrap gap-2 overflow-y-auto">
          {sugestoes.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => adicionar(tag.id)}
              className="rounded px-2 py-1 text-xs font-bold hover:brightness-125"
              style={estilo(tag)}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 font-Alexandria text-sm font-[700] uppercase text-gray-300">
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function Segmentado<T extends string>({
  valor,
  opcoes,
  onChange,
}: {
  valor: T;
  opcoes: { valor: T; rotulo: string }[];
  onChange: (valor: T) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-md bg-fundo">
      {opcoes.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          onClick={() => onChange(opcao.valor)}
          className={`flex-1 px-2 py-1.5 text-sm transition ${
            valor === opcao.valor
              ? "bg-botao-claro font-semibold text-fundo"
              : "hover:bg-botao"
          }`}
        >
          {opcao.rotulo}
        </button>
      ))}
    </div>
  );
}

function BookFilterPanel({
  aberto,
  filtros,
  onChange,
  totalLivros,
  totalFiltrados,
  todasTags,
  onClose,
}: BookFilterPanelProps) {
  useEffect(() => {
    if (!aberto) return;

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", aoTeclar);

    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, onClose]);

  if (!aberto) return null;

  const semMudancas =
    JSON.stringify(filtros) === JSON.stringify(FILTROS_LIVROS_PADRAO);

  function atualizar(parcial: Partial<FiltrosLivros>) {
    onChange({ ...filtros, ...parcial });
  }

  function numeroOuNulo(texto: string) {
    if (texto === "") return null;

    const numero = Number(texto);

    return Number.isFinite(numero) ? Math.max(0, numero) : null;
  }

  return (
    <aside
      data-painel-filtros
      className="fixed bottom-0 right-0 top-20 z-40 flex w-1/4 min-w-72 flex-col bg-base text-white shadow-xl"
    >
      <div className="flex items-center justify-between p-4 pb-2">
        <h2 className="font-Alexandria text-lg font-[700]">
          Filtros
        </h2>

        <button
          type="button"
          onClick={onClose}
          title="Fechar filtros"
          className="hover:opacity-60"
        >
          <FaTimes />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Secao titulo="Tags">
            <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm">
                <input
                type="checkbox"
                checked={filtros.semTags}
                onChange={(e) => atualizar({ semTags: e.target.checked })}
                />
                Somente livros sem tags
            </label>

            <ExcluirTags
                todasTags={todasTags}
                selecionadas={filtros.tagsExcluidas}
                onChange={(tagsExcluidas) => atualizar({ tagsExcluidas })}
            />
            </Secao>
        
        
        
        <Secao titulo="Quantidade de páginas">
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              placeholder="Mín."
              autoComplete="off"
              value={filtros.paginasMin ?? ""}
              onChange={(e) =>
                atualizar({
                  paginasMin: numeroOuNulo(e.target.value),
                })
              }
              className={classeCampo}
            />

            <input
              type="number"
              min={0}
              placeholder="Máx."
              autoComplete="off"
              value={filtros.paginasMax ?? ""}
              onChange={(e) =>
                atualizar({
                  paginasMax: numeroOuNulo(e.target.value),
                })
              }
              className={classeCampo}
            />
          </div>
        </Secao>

        <Secao titulo="Data">
          <select
            value={filtros.campoData}
            onChange={(e) =>
              atualizar({
                campoData: e.target.value as FiltrosLivros["campoData"],
              })
            }
            className={`${classeCampo} mb-2`}
          >
            <option value="criacao">Data de criação</option>
            <option value="modificacao">Data de modificação</option>
          </select>

          <div className="flex gap-2">
            <label className="flex-1 text-xs text-gray-300">
              De
              <input
                type="date"
                value={filtros.dataDe ?? ""}
                onChange={(e) =>
                  atualizar({ dataDe: e.target.value || null })
                }
                className={`${classeCampo} mt-1`}
              />
            </label>

            <label className="flex-1 text-xs text-gray-300">
              Até
              <input
                type="date"
                value={filtros.dataAte ?? ""}
                onChange={(e) =>
                  atualizar({ dataAte: e.target.value || null })
                }
                className={`${classeCampo} mt-1`}
              />
            </label>
          </div>
        </Secao>

        <Secao titulo="Ordenar por">
          <select
            value={filtros.ordenarPor}
            onChange={(e) =>
              atualizar({
                ordenarPor: e.target.value as FiltrosLivros["ordenarPor"],
              })
            }
            className={`${classeCampo} mb-2`}
          >
            <option value="padrao">Padrão</option>
            <option value="nome">Nome</option>
            <option value="paginas">Quantidade de páginas</option>
            <option value="criacao">Data de criação</option>
            <option value="modificacao">Data de modificação</option>
          </select>

          <Segmentado
            valor={filtros.ordem}
            opcoes={[
              { valor: "asc", rotulo: "Crescente" },
              { valor: "desc", rotulo: "Decrescente" },
            ]}
            onChange={(ordem) => atualizar({ ordem })}
          />
        </Secao>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border p-3 text-sm">
        <span className="text-gray-300">
          {totalFiltrados} de {totalLivros} livros
        </span>

        <button
          type="button"
          onClick={() => onChange(FILTROS_LIVROS_PADRAO)}
          disabled={semMudancas}
          className="rounded-md bg-botao px-3 py-1.5 hover:brightness-110 disabled:opacity-40"
        >
          Limpar filtros
        </button>
      </div>
    </aside>
  );
}

export default BookFilterPanel;
