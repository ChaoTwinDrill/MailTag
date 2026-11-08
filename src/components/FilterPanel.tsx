import { useEffect, type ReactNode, useState } from "react";
import { FaTimes } from "react-icons/fa";
import type { tags } from "./types/tag";

import {
  FILTROS_PADRAO,
  type CampoData,
  type Filtros,
  type Ordenacao,
} from "../lib/filtros";

type FilterPanelProps = {
  aberto: boolean;
  filtros: Filtros;
  onChange: (filtros: Filtros) => void;
  extensoesDisponiveis: string[];
  totalMidias: number;
  totalFiltradas: number;
  onClose: () => void;
  todasTags: tags[]
};

const classeCampo =
  "w-full rounded-md bg-fundo p-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 [color-scheme:dark]";

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
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
    border: t.hasBorder ? `2px solid ${t.borderColor ?? "#ffffff"}` : "none",
  });

  return (
    <div className="mt-4">
      <p className="mb-1 text-xs text-gray-300">
        Ocultar mídias que tenham estas tags:
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
                  onClick={() => onChange(selecionadas.filter((s) => s !== id))}
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

          const exata = sugestoes.find((t) => t.name.toLowerCase() === busca);
          const escolhida = exata ?? (sugestoes.length === 1 ? sugestoes[0] : null);

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

function FilterPanel({
  aberto,
  filtros,
  onChange,
  extensoesDisponiveis,
  totalMidias,
  totalFiltradas,
  onClose,
  todasTags,
}: FilterPanelProps) {
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
    JSON.stringify(filtros) === JSON.stringify(FILTROS_PADRAO);

  function atualizar(parcial: Partial<Filtros>) {
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
        <h2 className="font-Alexandria text-lg font-[700]">Filtros</h2>

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
        <Secao titulo="Tipo de mídia">
          <Segmentado
            valor={filtros.tipo}
            opcoes={[
              { valor: "todos", rotulo: "Todos" },
              { valor: "imagem", rotulo: "Imagens" },
              { valor: "video", rotulo: "Vídeos" },
            ]}
            onChange={(tipo) => atualizar({ tipo })}
          />
        </Secao>

        {extensoesDisponiveis.length > 0 && (
          <Secao titulo="Extensão">
            <div className="flex flex-wrap gap-2">
              {extensoesDisponiveis.map((extensao) => {
                const ativa = filtros.extensoes.includes(extensao);

                return (
                  <button
                    key={extensao}
                    type="button"
                    onClick={() =>
                      atualizar({
                        extensoes: ativa
                          ? filtros.extensoes.filter((e) => e !== extensao)
                          : [...filtros.extensoes, extensao],
                      })
                    }
                    className={`rounded px-2 py-1 text-xs font-semibold uppercase transition ${
                      ativa
                        ? "bg-botao-claro text-fundo"
                        : "bg-fundo hover:bg-botao"
                    }`}
                  >
                    {extensao}
                  </button>
                );
              })}
            </div>
          </Secao>
        )}

        <Secao titulo="Orientação">
          <Segmentado
            valor={filtros.orientacao}
            opcoes={[
              { valor: "todas", rotulo: "Todas" },
              { valor: "horizontal", rotulo: "Horiz." },
              { valor: "vertical", rotulo: "Vert." },
              { valor: "quadrada", rotulo: "Quad." },
            ]}
            onChange={(orientacao) => atualizar({ orientacao })}
          />
        </Secao>

        <Secao titulo="Tags">
          <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filtros.semTags}
              onChange={(e) => atualizar({ semTags: e.target.checked })}
            />
            Somente mídias sem tags
          </label>

          <p className="mb-1 text-xs text-gray-300">
            Com várias tags na busca, mostrar mídias que tenham:
          </p>

          <Segmentado
            valor={filtros.modoTags}
            opcoes={[
              { valor: "todas", rotulo: "Todas" },
              { valor: "qualquer", rotulo: "Qualquer uma" },
            ]}
            onChange={(modoTags) => atualizar({ modoTags })}
          />
             <ExcluirTags
                todasTags={todasTags}
                selecionadas={filtros.tagsExcluidas}
                onChange={(tagsExcluidas) => atualizar({ tagsExcluidas })}
                />

        </Secao>
           
        <Secao titulo="Tamanho do arquivo">
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              step="any"
              placeholder="Mín. (MB)"
              autoComplete="off"
              value={filtros.tamanhoMinMB ?? ""}
              onChange={(e) =>
                atualizar({ tamanhoMinMB: numeroOuNulo(e.target.value) })
              }
              className={classeCampo}
            />

            <input
              type="number"
              min={0}
              step="any"
              placeholder="Máx. (MB)"
              autoComplete="off"
              value={filtros.tamanhoMaxMB ?? ""}
              onChange={(e) =>
                atualizar({ tamanhoMaxMB: numeroOuNulo(e.target.value) })
              }
              className={classeCampo}
            />
          </div>
        </Secao>

        <Secao titulo="Data">
          <select
            value={filtros.campoData}
            onChange={(e) =>
              atualizar({ campoData: e.target.value as CampoData })
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
              atualizar({ ordenarPor: e.target.value as Ordenacao })
            }
            className={`${classeCampo} mb-2`}
          >
            <option value="padrao">Padrão</option>
            <option value="nome">Nome</option>
            <option value="tamanho">Tamanho</option>
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
          {totalFiltradas} de {totalMidias} mídias
        </span>

        <button
          type="button"
          onClick={() => onChange(FILTROS_PADRAO)}
          disabled={semMudancas}
          className="rounded-md bg-botao px-3 py-1.5 hover:brightness-110 disabled:opacity-40"
        >
          Limpar filtros
        </button>
      </div>
    </aside>
  );
}

export default FilterPanel;
