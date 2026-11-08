import { useEffect, useMemo, useState } from "react";
import { FaTimes } from "react-icons/fa";
import type { Media } from "./types/media";
import type { tags } from "./types/tag";

type TagManagerProps = {
  aberto: boolean;
  allTags: tags[];
  medias: Media[];
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
  onCreateCategory: (nome: string) => Promise<tags | null>;
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
}: TagManagerProps) {
  const [busca, setBusca] = useState("");
  const [novaTag, setNovaTag] = useState("");
  const [editando, setEditando] = useState<tags | null>(null);
  const [prioridade, setPrioridade] = useState("");
  const [nome, setNome] = useState(""); 
  const [cor, setCor] = useState("#6366f1");
  const [corTexto, setCorTexto] = useState("#ffffff");
  const [temBorda, setTemBorda] = useState(false);
  const [corBorda, setCorBorda] = useState("#ffffff");
  const [parentTagId, setParentTagId] = useState<string | null>(null);

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
    setNome(tag.name);
    setCor(tag.color ?? "#6366f1");
    setCorTexto(tag.textColor ?? "#ffffff");
    setTemBorda(tag.hasBorder);
    setCorBorda(tag.borderColor ?? "#ffffff");
    setParentTagId(tag.parentTagId);
    setEditando(tag);
    setPrioridade(tag.priority?.toString() ?? "");
  }

  function salvar() {
    if (!editando) return;
    const numero = prioridade.trim() === "" ? null : Number(prioridade);
    const nomeLimpo = nome.trim();

    if (!nomeLimpo) {
      alert("O nome da tag não pode ficar vazio.");
      return;
    }

    const duplicada = allTags.some(
      (t) =>
        t.id !== editando.id &&
        t.name.toLowerCase() === nomeLimpo.toLowerCase()
    );

    if (duplicada) {
      alert("Já existe uma tag com esse nome.");
      return;
    }

    onCustomizeTag(
      editando.id,
      nomeLimpo,
      cor,
      corTexto,
      temBorda,
      corBorda,
      parentTagId,
      Number.isFinite(numero) ? numero : null
    );

    setEditando(null);
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

  async function criar() {
    const texto = novaTag.trim();

    if (!texto) return;

    await onCreateCategory(texto);
    setNovaTag("");
  }

  const temFilhas = editando
    ? allTags.some((t) => t.parentTagId === editando.id)
    : false;

  const categorias = allTags
    .filter((t) => t.parentTagId === null && t.id !== editando?.id)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

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
          <div className="overflow-y-auto p-4 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <label className="mb-2 block text-sm text-gray-300">Nome</label>
            <input
              value={nome}
              autoComplete="off"
              autoFocus
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && salvar()}
              className={`${classeCampo} mb-5`}
            />

            <label className="mb-2 block text-sm text-gray-300">
              Categoria pai
            </label>
            <select
              value={parentTagId ?? ""}
              disabled={temFilhas}
              onChange={(e) => setParentTagId(e.target.value || null)}
              className={`${classeCampo} ${temFilhas ? "mb-1" : "mb-5"} disabled:opacity-50`}
            >
              <option value="">Nenhuma</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {temFilhas && (
              <p className="mb-5 text-sm text-gray-400">
                Esta tag já é categoria de outras tags, por isso não pode ter
                categoria pai.
              </p>
            )}  
            {temFilhas && (
              <>
                <label className="mb-2 block text-sm text-gray-300">
                  Prioridade da categoria
                </label>
                <input
                  type="number"
                  step={1}
                  value={prioridade}
                  onChange={(e) => setPrioridade(e.target.value)}
                  placeholder="Menor número = aparece primeiro"
                  className={`${classeCampo} mb-5`}
                />
              </>
            )}
            <label className="mb-2 block text-sm text-gray-300">
              Cor de fundo
            </label>
            <div className="mb-5 flex items-center gap-3">
              <input
                type="color"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded"
              />
              <span className="text-sm text-gray-400">{cor}</span>
            </div>

            <label className="mb-2 block text-sm text-gray-300">
              Cor do texto
            </label>
            <div className="mb-5 flex items-center gap-3">
              <input
                type="color"
                value={corTexto}
                onChange={(e) => setCorTexto(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded"
              />
              <span className="text-sm text-gray-400">{corTexto}</span>
            </div>

            <label className="mb-3 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={temBorda}
                onChange={(e) => setTemBorda(e.target.checked)}
              />
              <span>Adicionar borda</span>
            </label>

            {temBorda && (
              <div className="mb-5 flex items-center gap-3">
                <input
                  type="color"
                  value={corBorda}
                  onChange={(e) => setCorBorda(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded"
                />
                <span className="text-sm text-gray-400">{corBorda}</span>
              </div>
            )}

            <p className="mb-2 text-sm text-gray-300">Prévia</p>
            <span
              className="mb-6 inline-block rounded px-3 py-2"
              style={{
                backgroundColor: cor,
                color: corTexto,
                border: temBorda ? `2px solid ${corBorda}` : "none",
              }}
            >
              {nome || "Nome da tag"}
            </span>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditando(null)}
                className="rounded-md bg-botao px-4 py-2 hover:brightness-110"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={salvar}
                className="rounded-md bg-botao-claro px-4 py-2 text-fundo hover:brightness-110"
              >
                Salvar
              </button>
            </div>
          </div>
        ) : (
          <>
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