import { useEffect } from "react";
import { FaTimes } from "react-icons/fa";
import type { tags } from "./types/tag";
import TagMultiSelect from "./TagMultiSelect";
import { Secao, Segmentado, classeCampo } from "./FiltroUI";

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

            <div className="mt-4">
              <TagMultiSelect
                allTags={todasTags}
                selectedIds={filtros.tagsExcluidas}
                onChange={(tagsExcluidas) => atualizar({ tagsExcluidas })}
                rotulo="Ocultar livros que tenham estas tags:"
                removerTitulo="Parar de ocultar"
              />
            </div>
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