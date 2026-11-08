
import { useEffect, useState, useRef } from "react";
import Tagbutton from "./Tagbutton";
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
  onRenameMedia: (mediaId: string, novoNome: string) => void;
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
  onRenameMedia,
  onOpenViewer, 
  
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
  const [editandoNome, setEditandoNome] = useState(false);
  const [nomeEditado, setNomeEditado] = useState("");
  const cancelouNome = useRef(false);
  const [prioridade, setPrioridade] = useState("");

  // Categoria digitada que ainda não existe: só é criada ao salvar
  const [categoriaNova, setCategoriaNova] = useState<string | null>(null);

  // Miniatura mostrada enquanto o original ainda está sendo carregado
  const [previa, setPrevia] = useState("");



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

    useEffect(() => {
      function lidarComTecla(e: KeyboardEvent) {
        if (e.key === "Escape") {
          setMenu(null);
          setTagPersonalizando(null);
          setMostrarSugestoes(false);
        }
      }

      function aoClicar(e: MouseEvent) {
        setMenu(null);

        if (
          categoriaRef.current &&
          !categoriaRef.current.contains(e.target as Node)
        ) {
          setMostrarSugestoes(false);
        }
      }

      window.addEventListener("click", aoClicar);
      window.addEventListener("keydown", lidarComTecla);

      return () => {
        window.removeEventListener("click", aoClicar);
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
    setPrioridade(tag.priority?.toString() ?? "");
    setParentTagId(tag.parentTagId);
    setBuscaCategoria(categoriaAtual?.name ?? "");
    setCategoriaNova(null);
    setMostrarSugestoes(false);

    setTagPersonalizando(tag);
    setMenu(null);
  }

  async function salvarPersonalizacao() {
    if (!tagPersonalizando) return;
    const numero = prioridade.trim() === "" ? null : Number(prioridade);
    const nomeLimpo = nome.trim();

    if (!nomeLimpo) {
      alert("O nome da tag não pode ficar vazio.");
      return;
    }

    let categoriaId = parentTagId;

    // A categoria nova só é criada agora, ao salvar
    if (categoriaNova) {
      const novaCategoria = await onCreateCategory(categoriaNova);

      if (!novaCategoria) return;

      categoriaId = novaCategoria.id;
    }

    onCustomizeTag(
      tagPersonalizando.id,
      nomeLimpo,
      cor,
      corTexto,
      temBorda,
      corBorda,
      categoriaId,
      Number.isFinite(numero) ? numero : null
    );

    setTagPersonalizando(null);
  }

  // Categorias disponíveis: tags que não possuem uma categoria pai.
  // Uma tag nunca pode ser sua própria categoria.
      useEffect(() => {
        setEditandoNome(false);
      }, [media?.id]);
      
      function iniciarRenomeacao() {
        if (!media) return;

        const ponto = media.name.lastIndexOf(".");
        const base = ponto > 0 ? media.name.slice(0, ponto) : media.name;

        setNomeEditado(base);
        setEditandoNome(true);
      }

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

        if (novoNome !== media.name) onRenameMedia(media.id, novoNome);
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
          
          // Uma tag que já é categoria de outras não pode virar filha
          const temFilhas = tagPersonalizando
            ? allTags.some((t) => t.parentTagId === tagPersonalizando.id)
            : false;

          const categoriasFiltradas = allTags.filter(
            (tag) =>
              tag.parentTagId === null &&
              tag.id !== tagPersonalizando?.id &&
              tag.name.toLowerCase().includes(buscaCategoria.toLowerCase())
          );
          
          return (
            <aside className="relative w-1/4 min-h-0 shrink-0 bg-base overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-white">
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
      
    )
    .sort(([, a], [, b]) => {
    if (!a.categoria) return 1;
    if (!b.categoria) return -1;

    const pa = a.categoria.priority ?? Infinity;
    const pb = b.categoria.priority ?? Infinity;

    if (pa !== pb) return pa - pb;

    return a.categoria.name.localeCompare(b.categoria.name, "pt-BR");
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

        <p className="mt-2 text-sm text-gray-400 font-Alexandria font-[500]">
          Tamanho: {formatarTamanho(media.size)}
        </p>

        {media.width && media.height ? (
          <p className="mt-1 text-sm text-gray-400 font-Alexandria font-[500]">
            {media.width} x {media.height} px
          </p>
        ) : null}

        <p className="mt-1 text-sm text-gray-400 font-Alexandria font-[500]">
          Extensão: {media.name.split(".").pop()?.toUpperCase() ?? "Sem extensão"}
        </p>

        <p className="mt-1 text-sm text-gray-400 font-Alexandria font-[500]">
          Criado em: {formatarData(media.createdAt)}
        </p>

        <p className="mt-1 pb-6 text-sm text-gray-400 font-Alexandria font-[500]">
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
              autoComplete="off"
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
                autoComplete="off"
                value={buscaCategoria}
                disabled={temFilhas}
                onChange={(e) => {
                  setBuscaCategoria(e.target.value);
                  setParentTagId(null);
                  setCategoriaNova(null);
                  setMostrarSugestoes(true);
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  e.stopPropagation();

                  const nomeCategoria = buscaCategoria.trim();
                  if (!nomeCategoria) return;

                  // Procura uma tag existente com o mesmo nome
                  const existente = allTags.find(
                    (tag) =>
                      tag.parentTagId === null &&
                      tag.id !== tagPersonalizando?.id &&
                      tag.name.toLowerCase() === nomeCategoria.toLowerCase()
                  );

                  if (existente) {
                    setParentTagId(existente.id);
                    setCategoriaNova(null);
                    setBuscaCategoria(existente.name);
                    setMostrarSugestoes(false);
                    return;
                  }

                  // Não existe: será criada somente ao salvar
                  setParentTagId(null);
                  setCategoriaNova(nomeCategoria);
                  setMostrarSugestoes(false);
                }}
                onFocus={() => setMostrarSugestoes(true)}
                placeholder="Digite o nome da categoria..."
                className="w-full rounded-md bg-fundo p-2 outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
              />

              {temFilhas && (
                <p className="mt-1 text-sm text-gray-400">
                  Esta tag já é categoria de outras tags, por isso não pode ter categoria pai.
                </p>
              )}

              {categoriaNova && (
                <p className="mt-1 text-sm text-gray-400">
                  A categoria "{categoriaNova}" será criada ao salvar.
                </p>
              )}

              {buscaCategoria && (
                <button
                  type="button"
                  onClick={() => {
                    setBuscaCategoria("");
                    setParentTagId(null);
                    setCategoriaNova(null);
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
                          setCategoriaNova(null);
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
                    className="mb-5 w-full rounded-md bg-fundo p-2 outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </>
              )}
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
