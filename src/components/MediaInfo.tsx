import { useEffect, useState, useRef } from "react";
import AdicionarTagBar from "./AdicionarTagBar";
import TagEditor from "./TagEditor";
import TagGroups from "./TagGroups";
import PainelVazio from "./PainelVazio";
import InfoLista from "./InfoLista";
import { FaImages } from "react-icons/fa";
import VideoPlayer from "./VideoPlayer";
import type { Media } from "./types/media";
import type { tags } from "./types/tag";
import { useNomeDoPerfil } from "../lib/perfis";
import { obterArquivoCacheado } from "../lib/cache";
import Sequencia from "./Sequencia";
import { formatarDuracao } from "../lib/duracao";

const miniaturaDaMidia = (m: Media) => m.thumbnailR2Key;
const anteriorDaMidia = (m: Media) => m.previousMediaId ?? null;
interface MediaInfoProps {
  media: Media | null;
  allTags: tags[];
  onSearchTag?: (tagId: string, excluir: boolean) => void;
  onAddTag: (mediaId: string, nomeTag: string) => void;
  onRemoveTag: (mediaId: string, tagId: string) => void;
  onDeleteTag: (tagId: string) => void;
  todasMedias: Media[];
  onSetPrevious: (mediaId: string, anteriorId: string | null) => void;
  onOpenRelated: (mediaId: string) => void;
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
  onDurationKnown: (mediaId: string, segundos: number) => void;
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
  onDurationKnown,
  onCustomizeTag,
  onChangeAutoTags,
  onRenameMedia,
  onSearchTag,
  onOpenViewer,
  onCreateCategory,
  todasMedias,
  onSetPrevious,
  onOpenRelated,
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
  const adicionadoPor = useNomeDoPerfil(media?.createdBy);
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
      <PainelVazio
        icone={FaImages}
        titulo="Nenhuma mídia selecionada"
        texto="Clique em uma mídia para ver os detalhes e editar as tags."
      />
    );
  }

  return (
    <aside className="relative w-1/4 min-h-0 shrink-0 bg-base overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-white">
      {/* Prévia da mídia */}
      {media.mimeType?.startsWith("video/") ? (
        <VideoPlayer
          key={media.id}
          className="bg-black"
          src={media.src || undefined}
          poster={previa || undefined}
          videoClassName="w-full"
          onExpandir={onOpenViewer}
          onMetadata={(duracao) => {
            if (media.durationSeconds == null) onDurationKnown(media.id, duracao);
          }}
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
            className="w-full rounded-md bg-fundo p-1 text-[20px] font-Alexandria font-[700] outline-none focus:ring-2 focus:ring-botao-claro"
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

        {/* Tags da mídia, agrupadas por categoria */}
        <TagGroups
          tags={media.tags}
          allTags={allTags}
          onClick={(tag, e) => onSearchTag?.(tag.id, e.ctrlKey || e.metaKey)}
          onContextMenu={(tag, e) =>
            setMenu({ tag, x: e.clientX, y: e.clientY })
          }
          onRemove={(tag) => onRemoveTag(media.id, tag.id)}
        />

        <Sequencia
          rotuloItem="mídia"
          atualId={media.id}
          itens={todasMedias}
          getAnteriorId={anteriorDaMidia}
          getMiniaturaKey={miniaturaDaMidia}
          proporcao="aspect-square"
          onDefinirAnterior={onSetPrevious}
          onAbrir={onOpenRelated}
        />

        <InfoLista
          itens={[
            { rotulo: "Tamanho", valor: formatarTamanho(media.size) },
            media.width && media.height
              ? { rotulo: "Dimensões", valor: `${media.width} × ${media.height} px` }
              : null,
            {
              rotulo: "Extensão",
              valor: media.name.split(".").pop()?.toUpperCase() ?? "Sem extensão",
            },
            media.durationSeconds != null
              ? { rotulo: "Duração", valor: formatarDuracao(media.durationSeconds) }
              : null,
            { rotulo: "Criado em", valor: formatarData(media.createdAt) },
            { rotulo: "Modificado em", valor: formatarData(media.modifiedAt) },
            {
              rotulo: "Adicionado por",
              valor: media.createdBy ? adicionadoPor ?? "Usuário" : "—",
            },
          ]}
        />
      </div>

      {/* Botão para adicionar tags */}
      <AdicionarTagBar
        resetKey={media.id}
        tagIdsAtuais={media.tags.map((t) => t.id)}
        
        allTags={allTags}
        onAddTag={(nome) => onAddTag(media.id, nome)}
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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setTagPersonalizando(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col animate-pop rounded-xl border border-border bg-base text-white shadow-xl"
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