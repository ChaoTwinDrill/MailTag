
import { useEffect, useState, useRef } from "react";
import Tagbutton from "./Tagbutton";
import type { Media } from "./types/media";
import type { tags } from "./types/tag";

interface MediaInfoProps {
  media: Media | null;
  allTags: tags[];
  onAddTag: (mediaId: string, nomeTag: string) => void;
  onRemoveTag: (mediaId: string, tagId: string) => void;
  onDeleteTag: (tagId: string) => void;
  onCustomizeTag: (
    tagId: string,
    nome: string,
    cor: string | null,
    corTexto: string | null,
    temBorda: boolean,
    corBorda: string | null,
    parentTagId: string | null
  ) => void;
  onCreateCategory: (nome: string) => Promise<tags | null>;
}

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatarData(data: Date | null) {
  if (!data) return "Não disponível";
  return data.toLocaleString("pt-BR");
}

function MediaInfo({
  media,
  allTags,
  onAddTag,
  onRemoveTag,
  onDeleteTag,
  onCustomizeTag,
  onCreateCategory,
}: MediaInfoProps) {
  const [menu, setMenu] = useState<{
    tag: tags;
    x: number;
    y: number;
  } | null>(null);

  const [tagPersonalizando, setTagPersonalizando] = useState<tags | null>(null);
  const categoriaRef = useRef<HTMLDivElement>(null);
  const [buscaCategoria, setBuscaCategoria] = useState("");
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#6366f1");
  const [corTexto, setCorTexto] = useState("#ffffff");
  const [temBorda, setTemBorda] = useState(false);
  const [corBorda, setCorBorda] = useState("#ffffff");
  const [parentTagId, setParentTagId] = useState<string | null>(null);

    useEffect(() => {
      function fecharMenu() {
        setMenu(null);
      }

      function lidarComTecla(e: KeyboardEvent) {
        if (e.key === "Escape") {
          setMenu(null);
          setTagPersonalizando(null);
          setMostrarSugestoes(false);
        }
      }

      function fecharSugestoes(e: MouseEvent) {
        if (
          categoriaRef.current &&
          !categoriaRef.current.contains(e.target as Node)
        ) {
          setMostrarSugestoes(false);
        }
      }

      window.addEventListener("click", fecharMenu);
      window.addEventListener("click", fecharSugestoes);
      window.addEventListener("keydown", lidarComTecla);

      return () => {
        window.removeEventListener("click", fecharMenu);
        window.removeEventListener("click", fecharSugestoes);
        window.removeEventListener("keydown", lidarComTecla);
      };
    }, []);

  function abrirPersonalizacao(tag: tags) {
  const categoriaAtual = allTags.find(
    (t) => t.id === tag.parentTagId
  );

  setNome(tag.name);
    setCor(tag.color ?? "#6366f1");
    setCorTexto(tag.textColor ?? "#ffffff");
    setTemBorda(tag.hasBorder);
    setCorBorda(tag.borderColor ?? "#ffffff");

    setParentTagId(tag.parentTagId);
    setBuscaCategoria(categoriaAtual?.name ?? "");
    setMostrarSugestoes(false);

    setTagPersonalizando(tag);
    setMenu(null);
  }

  function salvarPersonalizacao() {
    if (!tagPersonalizando) return;

    if (!nome.trim()) {
      alert("O nome da tag não pode ficar vazio.");
      return;
    }

    onCustomizeTag(
      tagPersonalizando.id,
      nome,
      cor,
      corTexto,
      temBorda,
      corBorda,
      parentTagId
    );

    setTagPersonalizando(null);
  }

  // Categorias disponíveis: tags que não possuem uma categoria pai.
  // Uma tag nunca pode ser sua própria categoria.

          if (!media) {
            return (
              <aside className="w-1/4 shrink-0 bg-base text-white">
                <h2 className="text-lg font-semibold">
                  Informações de mídia
                </h2>
                <p className="mt-4 text-gray-400">
                  Nenhuma mídia selecionada.
                </p>
              </aside>
            );
          }
          
          const categoriasFiltradas = allTags.filter(
            (tag) =>
              tag.parentTagId === null &&
              tag.id !== tagPersonalizando?.id &&
              tag.name.toLowerCase().includes(buscaCategoria.toLowerCase())
          );
          
          return (
            <aside className="relative w-1/4 min-h-0 shrink-0 bg-base overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-white">
              <img
                src={media.src}
                alt={media.name}
                className="w-full object-cover"
              />

              <div className="mt-1 p-2">
                <h1 className="break-words text-[20px] font-alexandria font-[700]">
                  {media.name}
                </h1>

         {media.tags.length > 0 && (
  <div className="flex flex-col m-2 gap-3">
    {Object.entries(
      media.tags.reduce<Record<string, {
        categoria: tags | null;
        tags: tags[];
      }>>((grupos, tag) => {
        const categoria = allTags.find(
          (t) => t.id === tag.parentTagId
        ) ?? null;

        const chave = categoria?.id ?? "sem-categoria";

        if (!grupos[chave]) {
          grupos[chave] = { categoria, tags: [] };
        }

        grupos[chave].tags.push(tag);
        return grupos;
      }, {})
    ).map(([id, grupo]) => (
      <div
        key={id}
        className="relative min-w-0 mt-3 p-2 bg-fundo border-t-25 border-b-15 rounded-t-lg rounded-b-lg border-card"
      >
        {grupo.categoria && (
          <span className="absolute -top-[25px] left-1/2 -translate-x-1/2 px-2 bg-card font-semibold text-white whitespace-nowrap">
            {grupo.categoria.name}
          </span>
        )}

        <div className="flex flex-wrap gap-2">
          {grupo.tags.map((tag) => (
            <span
              key={tag.id}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({
                  tag,
                  x: e.clientX,
                  y: e.clientY,
                });
              }}
              onMouseDown={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  onRemoveTag(media.id, tag.id);
                }
              }}
              className="rounded px-2 py-1 font-semibold cursor-pointer"
              style={{
                backgroundColor: tag.color ?? undefined,
                color: tag.textColor ?? "#ffffff",
                border: tag.hasBorder
                  ? `2px solid ${tag.borderColor ?? "#ffffff"}`
                  : "none",
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      </div>
    ))}
  </div>
)}

        <p className="mt-2 text-sm text-gray-400 font-alexandria font-[500]">
          Tamanho: {formatarTamanho(media.size)}
        </p>

        <p className="mt-1 text-sm text-gray-400 font-alexandria font-[500]">
          {media.width} x {media.height} px
        </p>

        <p className="mt-1 text-sm text-gray-400 font-alexandria font-[500]">
          Extensão: {media.name.split(".").pop()?.toUpperCase() ?? "Sem extensão"}
        </p>

        <p className="mt-1 text-sm text-gray-400 font-alexandria font-[500]">
          Criado em: {formatarData(media.createdAt)}
        </p>

        <p className="mt-1 pb-6 text-sm text-gray-400 font-alexandria font-[500]">
          Modificado em: {formatarData(media.modifiedAt)}
        </p>
      </div>

      <Tagbutton media={media}
      onAddTag={onAddTag} 
      allTags={allTags} 
       />

      {/* Menu de contexto da tag */}
      {menu && (
        <div
          className="fixed z-50 min-w-44 rounded-md border border-base bg-fundo p-1 shadow-lg"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full rounded px-3 py-2 text-left hover:bg-botao"
            onClick={() => abrirPersonalizacao(menu.tag)}
          >
            Personalizar
          </button>

          <button
            className="w-full rounded px-3 py-2 text-left text-red-400 hover:bg-botao"
            onClick={() => {
              const confirmar = window.confirm(
                `Deseja excluir a tag "${menu.tag.name}" de toda a galeria?`
              );

              if (confirmar) {
                onDeleteTag(menu.tag.id);
              }

              setMenu(null);
            }}
          >
            Excluir tag
          </button>
        </div>
      )}

      {/* Modal de personalização */}
      {tagPersonalizando && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setTagPersonalizando(null)}
        >
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-base p-6 text-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-5 text-xl font-semibold">
              Personalizar tag
            </h2>

            <label className="mb-2 block text-sm text-gray-300">
              Nome
            </label>

            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mb-5 w-full rounded-md bg-fundo p-2 outline-none focus:ring-2 focus:ring-purple-400"
              placeholder="Nome da tag"
            />

            {/* Categoria pai */}
          
           <label className="mb-2 block text-sm text-gray-300">
              Categoria pai
            </label>

            <div ref={categoriaRef} className="relative mb-5">
              <input
                type="text"
                value={buscaCategoria}
                onChange={(e) => {
                  setBuscaCategoria(e.target.value);
                  setParentTagId(null);
                  setMostrarSugestoes(true);
                }}
                onKeyDown={async (e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  e.stopPropagation();
                  
                  const nome = buscaCategoria.trim();
                  if (!nome) return;

                  // Procura uma tag existente com o mesmo nome
                  const existente = allTags.find(
                    (tag) =>
                      tag.parentTagId === null &&
                      tag.id !== tagPersonalizando?.id &&
                      tag.name.toLowerCase() === nome.toLowerCase()
                  );

                  if (existente) {
                    setParentTagId(existente.id);
                    setBuscaCategoria(existente.name);
                    setMostrarSugestoes(false);
                    return;
                  }

                  // Cria uma nova tag caso não exista
                  const novaTag = await onCreateCategory(nome);

                  if (novaTag) {
                    setParentTagId(novaTag.id);
                    setBuscaCategoria(novaTag.name);
                    setMostrarSugestoes(false);
                  }
                }}
                onFocus={() => setMostrarSugestoes(true)}
                placeholder="Digite o nome da categoria..."
                className="w-full rounded-md bg-fundo p-2 outline-none focus:ring-2 focus:ring-purple-400"
              />

              {buscaCategoria && (
                <button
                  type="button"
                  onClick={() => {
                    setBuscaCategoria("");
                    setParentTagId(null);
                    setMostrarSugestoes(false);
                  }}
                  className="absolute right-3 top-2 text-gray-400 hover:text-white"
                >
                  ×
                </button>
              )}

              {mostrarSugestoes && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-y-auto rounded-md border border-border bg-fundo shadow-lg">
                  {categoriasFiltradas.length > 0 ? (
                    categoriasFiltradas.map((categoria) => (
                      <button
                        key={categoria.id}
                        type="button"
                        onClick={() => {
                          setParentTagId(categoria.id);
                          setBuscaCategoria(categoria.name);
                          setMostrarSugestoes(false);
                        }}
                        className="block w-full px-3 py-2 text-left hover:bg-botao"
                      >
                        {categoria.name}
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-sm text-gray-400">
                      Nenhuma categoria encontrada.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Cor de fundo */}
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

            {/* Cor do texto */}
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

            {/* Borda */}
            <label className="mb-3 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={temBorda}
                onChange={(e) => setTemBorda(e.target.checked)}
              />
              <span>Adicionar borda</span>
            </label>

            {temBorda && (
              <>
                <label className="mb-2 block text-sm text-gray-300">
                  Cor da borda
                </label>

                <div className="mb-5 flex items-center gap-3">
                  <input
                    type="color"
                    value={corBorda}
                    onChange={(e) => setCorBorda(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded"
                  />
                  <span className="text-sm text-gray-400">
                    {corBorda}
                  </span>
                </div>
              </>
            )}

            {/* Prévia */}
            <div className="mb-6">
              <p className="mb-2 text-sm text-gray-300">Prévia</p>

              <span
                className="inline-block rounded px-3 py-2"
                style={{
                  backgroundColor: cor,
                  color: corTexto,
                  border: temBorda
                    ? `2px solid ${corBorda}`
                    : "none",
                }}
              >
                {nome || "Nome da tag"}
              </span>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setTagPersonalizando(null)}
                className="rounded-md bg-botao px-4 py-2 hover:brightness-110"
              >
                Cancelar
              </button>

              <button
                onClick={salvarPersonalizacao}
                className="rounded-md bg-botao-claro px-4 py-2 hover:brightness-110"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

export default MediaInfo;
