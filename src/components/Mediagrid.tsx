
import { useEffect, useState, useMemo } from "react";
import type { Media } from "./types/media";
import MediaCard from "./Mediacard";
import MediaInfo from "./MediaInfo";
import type { tags } from "./types/tag";

const NUM_COLUNAS = 4;

type MediagridProps = {
    medias: Media[];
    onSelectMedia: (media: Media | null) => void;
    selectedMedia: Media | null;
    onAddTag: (mediaId: string, nomeTag: string) => void;
    onRemoveTag: (mediaId: string, tagId: string) => void;
    onDeleteMedia: (media: Media) => void;
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
    allTags: tags[];
    onCreateCategory: (nome: string) => Promise<tags | null>;
    onRenameMedia: (mediaId: string, novoNome: string) => void;
};

function Mediagrid({
    medias,
    allTags,
    onSelectMedia,
    selectedMedia,
    onAddTag,
    onRemoveTag,
    onDeleteMedia,
    onDeleteTag,
    onCustomizeTag,
    onCreateCategory,
    onRenameMedia
}: MediagridProps) {
    const [menu, setMenu] = useState<{
        media: Media;
        x: number;
        y: number;
    } | null>(null);


    const colunas = useMemo(() => {
    const resultado: Media[][] = Array.from(
        { length: NUM_COLUNAS },
        () => []
    );

    medias.forEach((media, indice) => {
        resultado[indice % NUM_COLUNAS].push(media);
    });

    return resultado;
}, [medias]);


    useEffect(() => {
        function fecharMenu() {
            setMenu(null);
        }

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") {
                setMenu(null);
                return;
            }

            if (e.key !== "Delete" || !selectedMedia) return;
            if (document.querySelector("[data-painel-filtros]")) return;
            const elemento = e.target as HTMLElement;

            if (
                elemento.isContentEditable ||
                ["INPUT", "TEXTAREA", "SELECT"].includes(elemento.tagName)
            ) {
                return;
            }

            e.preventDefault();
            setMenu(null);
            onDeleteMedia(selectedMedia);
        }

        window.addEventListener("click", fecharMenu);
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("click", fecharMenu);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [selectedMedia, onDeleteMedia]);

    function abrirMenu(media: Media, x: number, y: number) {
        setMenu({ media, x, y });
    }

    return (
        <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-5 bg-fundo">
               <div className="flex items-start gap-4">
                    {colunas.map((coluna, indice) => (
                        <div key={indice} className="flex min-w-0 flex-1 flex-col gap-4">
                            {coluna.map((media) => (
                                <MediaCard
                                    key={media.id}
                                    media={media}
                                    onSelectMedia={(selecionada) => {
                                        setMenu(null);
                                        onSelectMedia(selecionada);
                                    }}
                                    onContextMenu={abrirMenu}
                                    selected={selectedMedia?.id === media.id}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            <MediaInfo
              media={selectedMedia}
              allTags={allTags}
              onAddTag={onAddTag}
              onRemoveTag={onRemoveTag}
              onDeleteTag={onDeleteTag}
              onCustomizeTag={onCustomizeTag}
              onCreateCategory={onCreateCategory}
              onRenameMedia={onRenameMedia}
            />

            {menu && (
                <div
                    className="fixed z-50 min-w-40 rounded-md border border-base bg-fundo p-1 shadow-lg"
                    style={{ left: menu.x, top: menu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        className="w-full rounded px-3 py-2 text-left text-red-400 hover:bg-botao"
                        onClick={() => {
                            const media   = menu.media;
                            setMenu(null);
                            onDeleteMedia(media);
                        }}
                    >
                        Excluir mídia
                    </button>
                </div>
            )}
        </div>
    );
}

export default Mediagrid;
