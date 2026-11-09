import { useEffect, useState, useRef } from "react";
import Tagbutton from "./Tagbutton";
import TagEditor from "./TagEditor";

import type { Media } from "./types/media";
import type { tags } from "./types/tag";

import { obterArquivoCacheado } from "../lib/cache";

interface MediaInfoProps {
  media: Media | null;
  allTags: tags[];
  
  onAddTag: (mediaId: string, nomeTag: string) => void;
  onRemoveTag: (mediaId: string, tagId: string) => void;
  onDeleteTag: (tagId: string) => void;

  onOpenViewer: () => void;

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

  onChangeAutoTags: (tagId: string, ids: string[]) => void | Promise<void>;

  onRenameMedia: (mediaId: string, novoNome: string) => void;

  onCreateCategory: (nome: string) => Promise<tags | null>;
}

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

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
  onChangeAutoTags,
  onRenameMedia,
  onOpenViewer,
  onCreateCategory,
}: MediaInfoProps) {
  const [menu, setMenu] = useState<{
    tag: tags;
    x: number;
    y: number;
  } | null>(null);

  const [tagPersonalizando, setTagPersonalizando] =
    useState<tags | null>(null);

  const [editandoNome, setEditandoNome] = useState(false);
  const [nomeEditado, setNomeEditado] = useState("");

  const cancelouNome = useRef(false);

  // Miniatura mostrada enquanto o original ainda está sendo carregado
  const [previa, setPrevia] = useState("");

  // Carrega a miniatura da mídia
  useEffect(() => {
    setPrevia("");

    const chave = media?.thumbnailR2Key;

    if (!chave) return;

    let cancelado = false;

    obterArquivoCacheado(chave)
      .then((src) => {
        if (!cancelado) setPrevia(src);
      })
      .catch(() => {});

    return () => {
      cancelado = true;
    };
  }, [media?.id, media?.thumbnailR2Key]);

  // Fecha menus e modal com Escape ou clique fora
  useEffect(() => {
    function lidarComTecla(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenu(null);
        setTagPersonalizando(null);
      }
    }

    function aoClicar() {
      setMenu(null);
    }

    window.addEventListener("click", aoClicar);
    window.addEventListener("keydown", lidarComTecla);

    return () => {
      window.removeEventListener("click", aoClicar);
      window.removeEventListener("keydown", lidarComTecla);
    };
  }, []);

  // Abre o editor de personalização
  function abrirPersonalizacao(tag: tags) {
    setTagPersonalizando(tag);
    setMenu(null);
  }

  // Fecha a edição do nome ao trocar de mídia
  useEffect(() => {
    setEditandoNome(false);
  }, [media?.id]);

  // Inicia a renomeação da mídia
  function iniciarRenomeacao() {
    if (!media) return;

    const ponto = media.name.lastIndexOf(".");
    const base = ponto > 0 ? media.name.slice(0, ponto) : media.name;

    setNomeEditado(base);
    setEditandoNome(true);
  }

  // Confirma a renomeação da mídia
  function confirmarRenomeacao() {
    if (cancelouNome.current) {
      cancelouNome.current = false;
      return;
    }

    setEditandoNome(false);

    if (!media) return;

    const ponto = media.name.lastIndexOf(".");
    const extensao = ponto > 0 ? media.name.slice(ponto) : "";
    const base = nomeEditado.trim();

    if (!base) return;

    const novoNome = base + extensao;

    if (novoNome !== media.name) {
      onRenameMedia(media.id, novoNome);
    }
  }

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

  return (
    <aside className="relative w-1/4 min-h-0 shrink-0 bg-base overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-white">
      {/* Prévia da mídia */}
      {media.mimeType?.startsWith("video/") ? (
        <video
          key={media.id}
          src={media.src || undefined}
          poster={previa || undefined}
          controls
          preload="metadata"
          className="w-full"
        />
      ) : media.src || previa ? (
        <img
          src={media.src || previa}
          alt={media.name}
          onDoubleClick={onOpenViewer}
          className="w-full cursor-zoom-in object-cover"
        />
      ) : (
        <div
          className="w-full bg-card"
          style={{
            aspectRatio:
              media.width && media.height
                ? `${media.width} / ${media.height}`
                : "1 / 1",
          }}
        />
      )}

      <div className="mt-1 p-2">
        {/* Nome da mídia */}
        {editandoNome ? (
          <input
            autoFocus
            autoComplete="off"
            value={nomeEditado}
            onChange={(e) => setNomeEditado(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={confirmarRenomeacao}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }

              if (e.key === "Escape") {
                cancelouNome.current = true;
                setEditandoNome(false);
              }
            }}
            className="w-full rounded-md bg-fundo p-1 text-[20px] font-Alexandria font-[700] outline-none focus:ring-2 focus:ring-purple-400"
          />
        ) : (
          <h1
            onDoubleClick={iniciarRenomeacao}
            title="Clique duas vezes para renomear"
            className="break-words text-[20px] font-Alexandria font-[700] cursor-text"
          >
            {media.name}
          </h1>
        )}

        {/* Tags da mídia */}
        {media.tags.length > 0 && (
          <div className="flex flex-col m-2 gap-3">
            {Object.entries(
              media.tags.reduce<
                Record<
                  string,
                  {
                    categoria: tags | null;
                    tags: tags[];
                  }
                >
              >((grupos, tag) => {
                const categoria =
                  allTags.find((t) => t.id === tag.parentTagId) ?? null;

                const chave = categoria?.id ?? "sem-categoria";

                if (!grupos[chave]) {
                  grupos[chave] = {
                    categoria,
                    tags: [],
                  };
                }

                grupos[chave].tags.push(tag);

                return grupos;
              }, {})
            )
              .sort(([, a], [, b]) => {
                if (!a.categoria) return 1;
                if (!b.categoria) return -1;

                const pa = a.categoria.priority ?? Infinity;
                const pb = b.categoria.priority ?? Infinity;

                if (pa !== pb) return pa - pb;

                return a.categoria.name.localeCompare(
                  b.categoria.name,
                  "pt-BR"
                );
              })
              .map(([id, grupo]) => (
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

        {/* Informações da mídia */}
        <p className="mt-2 text-sm text-gray-400 font-Alexandria font-[500]">
          Tamanho: {formatarTamanho(media.size)}
        </p>

        {media.width && media.height ? (
          <p className="mt-1 text-sm text-gray-400 font-Alexandria font-[500]">
            {media.width} x {media.height} px
          </p>
        ) : null}

        <p className="mt-1 text-sm text-gray-400 font-Alexandria font-[500]">
          Extensão:{" "}
          {media.name.split(".").pop()?.toUpperCase() ?? "Sem extensão"}
        </p>

        <p className="mt-1 text-sm text-gray-400 font-Alexandria font-[500]">
          Criado em: {formatarData(media.createdAt)}
        </p>

        <p className="mt-1 pb-6 text-sm text-gray-400 font-Alexandria font-[500]">
          Modificado em: {formatarData(media.modifiedAt)}
        </p>
      </div>

      {/* Botão para adicionar tags */}
      <Tagbutton
        media={media}
        onAddTag={onAddTag}
        allTags={allTags}
      />

      {/* Menu de contexto da tag */}
      {menu && (
        <div
          className="fixed z-50 min-w-44 rounded-md border border-base bg-fundo p-1 shadow-lg"
          style={{
            left: menu.x,
            top: menu.y,
          }}
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
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-base text-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 pb-2">
              <h2 className="font-Alexandria text-lg font-[700]">
                Editar "{tagPersonalizando.name}"
              </h2>

              <button
                onClick={() => setTagPersonalizando(null)}
                className="rounded-md bg-botao px-3 py-2 hover:brightness-110"
              >
                Fechar
              </button>
            </div>

            <TagEditor
              key={tagPersonalizando.id}
              tag={tagPersonalizando}
              allTags={allTags}
              onSave={onCustomizeTag}
              onChangeAutoTags={onChangeAutoTags}
              onCreateCategory={onCreateCategory}
              onBack={() => setTagPersonalizando(null)}
            />
          </div>
        </div>
      )}
    </aside>
  );
}

export default MediaInfo;