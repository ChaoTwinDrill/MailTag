import { useEffect, useMemo, useState } from "react";
import { FaTimes } from "react-icons/fa";
import type { Media } from "./types/media";
import type { tags } from "./types/tag";
import TagEditor from "./TagEditor";

type TagManagerProps = {
  aberto: boolean;
  allTags: tags[];
  medias: Media[];
  onChangeAutoTags: (tagId: string, ids: string[]) => void | Promise<void>;
  onCreateCategory: (nome: string, categoriaId?: string | null) => Promise<tags | null>;
  categoriaPadraoId: string | null;
  onChangeCategoriaPadrao: (id: string | null) => void;
  onClose: () => void;
  onCustomizeTag: (
    tagId: string,
    nome: string,
    cor: string | null,
    corTexto: string | null,
    temBorda: boolean,
    corBorda: string | null,
    parentTagId: string | null,
    prioridade: number | null
  ) => void;
  onDeleteTag: (tagId: string) => void;
  
};

const classeCampo =
  "w-full rounded-md bg-fundo p-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 [color-scheme:dark]";

function estiloTag(t: tags) {
  return {
    backgroundColor: t.color ?? "#555555",
    color: t.textColor ?? "#ffffff",
    border: t.hasBorder ? `2px solid ${t.borderColor ?? "#ffffff"}` : "none",
  };
}

function TagManager({
  aberto,
  allTags,
  medias,
  onClose,
  onCustomizeTag,
  onDeleteTag,
  onCreateCategory,
  categoriaPadraoId,
  onChangeAutoTags,
  onChangeCategoriaPadrao
}: TagManagerProps) {
  const [busca, setBusca] = useState("");
  const [novaTag, setNovaTag] = useState("");
  const [editando, setEditando] = useState<tags | null>(null);

  useEffect(() => {
    if (!aberto) {
      setEditando(null);
      setBusca("");
      setNovaTag("");
      return;
    }

    function aoTeclar(e: KeyboardEvent) {
      if (e.key !== "Escape") return;

      if (editando) setEditando(null);
      else onClose();
    }

    window.addEventListener("keydown", aoTeclar);

    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, editando, onClose]);

  // Quantas mídias usam cada tag
  const contagem = useMemo(() => {
    const mapa = new Map<string, number>();

    for (const media of medias) {
      for (const tag of media.tags) {
        mapa.set(tag.id, (mapa.get(tag.id) ?? 0) + 1);
      }
    }

    return mapa;
  }, [medias]);

  if (!aberto) return null;

  const termo = busca.trim().toLowerCase();

  const lista = allTags
    .filter((t) => !termo || t.name.toLowerCase().includes(termo))
    .sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
    );

  function abrirEdicao(tag: tags) {
  setEditando(tag);
}

  function excluir(tag: tags) {
    const usos = contagem.get(tag.id) ?? 0;

    const confirmar = window.confirm(
      usos > 0
        ? `A tag "${tag.name}" está em ${usos} mídia(s). Deseja excluí-la de toda a galeria?`
        : `Deseja excluir a tag "${tag.name}"?`
    );

    if (confirmar) onDeleteTag(tag.id);
  }

    async function criarCategoriaTags() {
    const categoria = await onCreateCategory("Tags", null);

    if (categoria) onChangeCategoriaPadrao(categoria.id);
  }

  async function criar() {
    const texto = novaTag.trim();

    if (!texto) return;

    await onCreateCategory(texto, categoriaPadraoId);
    setNovaTag("");
  }

  return (
    <div
      data-painel-filtros
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-base text-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 pb-2">
          <h2 className="font-Alexandria text-lg font-[700]">
            {editando ? `Editar "${editando.name}"` : "Gerenciar tags"}
          </h2>

          <button
            type="button"
            onClick={onClose}
            title="Fechar"
            className="hover:opacity-60"
          >
            <FaTimes />
          </button>
        </div>

       {editando ? (
          <TagEditor
            tag={editando}
            allTags={allTags}
            onSave={onCustomizeTag}
            onChangeAutoTags={onChangeAutoTags}
            onBack={() => setEditando(null)}
            onCreateCategory={onCreateCategory}
          />
        ) : (
          <>

            <div className="px-4 pb-2">
              <label className="mb-1 block text-xs text-gray-300">
                Categoria padrão para novas tags
              </label>

              <div className="flex gap-2">
                <select
                  value={categoriaPadraoId ?? ""}
                  onChange={(e) => onChangeCategoriaPadrao(e.target.value || null)}
                  className={classeCampo}
                >
                  <option value="">Nenhuma</option>
                  {allTags
                    .filter((t) => t.parentTagId === null)
                    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>

                {!allTags.some((t) => t.name.toLowerCase() === "tags") && (
                  <button
                    type="button"
                    onClick={criarCategoriaTags}
                    className="shrink-0 rounded-md bg-botao px-3 text-sm hover:brightness-110"
                  >
                    Criar "Tags"
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2 px-4 pb-2">
              <input
                type="text"
                autoComplete="off"
                placeholder="Buscar tag..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className={classeCampo}
              />
              <input
                type="text"
                autoComplete="off"
                placeholder="Nova tag..."
                value={novaTag}
                onChange={(e) => setNovaTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && criar()}
                className={classeCampo}
              />
              <button
                type="button"
                onClick={criar}
                disabled={!novaTag.trim()}
                className="shrink-0 rounded-md bg-botao px-3 text-sm hover:brightness-110 disabled:opacity-40"
              >
                Criar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {lista.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-300">
                  Nenhuma tag encontrada.
                </p>
              ) : (
                lista.map((tag) => {
                  const categoria = allTags.find(
                    (t) => t.id === tag.parentTagId
                  );
                  const usos = contagem.get(tag.id) ?? 0;

                  return (
                    <div
                      key={tag.id}
                      className="mb-2 flex items-center gap-3 rounded-md bg-fundo p-2"
                    >
                      <span
                        className="shrink-0 rounded px-2 py-1 text-sm font-semibold"
                        style={estiloTag(tag)}
                      >
                        {tag.name}
                      </span>

                      <span className="min-w-0 flex-1 truncate text-xs text-gray-300">
                        {tag.priority !== null && `Prioridade ${tag.priority} · `}
                        {categoria ? `${categoria.name} · ` : ""}
                        {usos} {usos === 1 ? "mídia" : "mídias"}
                      </span>

                      <button
                        type="button"
                        onClick={() => abrirEdicao(tag)}
                        className="rounded bg-botao px-2 py-1 text-sm hover:brightness-110"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => excluir(tag)}
                        className="rounded bg-botao px-2 py-1 text-sm text-red-400 hover:brightness-110"
                      >
                        Excluir
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-border p-3 text-sm text-gray-300">
              {lista.length} de {allTags.length} tags
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TagManager;