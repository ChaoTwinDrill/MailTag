import { useEffect, useState, useMemo, useRef } from "react";
import type { Media } from "./types/media";
import MediaCard from "./Mediacard";
import MediaInfo from "./MediaInfo";
import type { tags } from "./types/tag";
import MediaViewer from "./MediaViewer";
import BatchTagModal from "./BatchTagModal";

const NUM_COLUNAS = 4;

type MediagridProps = {
    medias: Media[];
    todasMedias: Media[];
    
    onSelectMedia: (media: Media | null) => void;
    selectedMedia: Media | null;
    onAddTag: (mediaId: string, nomeTag: string) => void;
    onAddTagToMany: (mediaIds: string[], nomeTag: string) => void;
    onRemoveTag: (mediaId: string, tagId: string) => void;
    onDeleteMedias: (medias: Media[]) => void;
    onSetPrevious: (mediaId: string, anteriorId: string | null) => void;
    onDeleteTag: (tagId: string) => void;
    onChangeAutoTags: (tagId: string, ids: string[]) => void | Promise<void>;
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
    allTags: tags[];
    onCreateCategory: (nome: string) => Promise<tags | null>;
    onRenameMedia: (mediaId: string, novoNome: string) => void;
    onDurationKnown: (mediaId: string, segundos: number) => void;
};

function Mediagrid({
    medias,
    allTags,
    onSelectMedia,
    selectedMedia,
    onAddTag,
    onAddTagToMany,
    onRemoveTag,
    onDeleteMedias,
    todasMedias,
    onSetPrevious,
    onDeleteTag,
    onCustomizeTag,
    onCreateCategory,
    onChangeAutoTags,
    onDurationKnown,
    onRenameMedia,
}: MediagridProps) {
    const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
    const [visualizando, setVisualizando] = useState(false);
    const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
    const [marcandoTag, setMarcandoTag] = useState(false);
    const ancoraRef = useRef<string | null>(null);
    

    const multiplas = selecionadas.size > 1;

    const alvos = medias.filter((m) => selecionadas.has(m.id));
    const quantidade = alvos.length;

    useEffect(() => {
        setSelecionadas((atuais) => {
            const validos = new Set(medias.map((m) => m.id));
            const novas = new Set([...atuais].filter((id) => validos.has(id)));
            return novas.size === atuais.size ? atuais : novas;
        });
    }, [medias]);

    function excluirSelecionadas() {
        const lista = alvos.length > 0 ? alvos : selectedMedia ? [selectedMedia] : [];

        setMenu(null);

        if (lista.length > 0) onDeleteMedias(lista);
    }

    useEffect(() => {
        if (!selectedMedia) {
            setVisualizando(false);
            setSelecionadas((atuais) => (atuais.size ? new Set() : atuais));
            ancoraRef.current = null;
        }
    }, [selectedMedia]);

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

    function limparSelecao() {
        setSelecionadas(new Set());
        ancoraRef.current = null;
        setMenu(null);
        onSelectMedia(null);
    }

    useEffect(() => {
        function fecharMenu() {
            setMenu(null);
        }

        function handleKeyDown(e: KeyboardEvent) {
            const elemento = e.target as HTMLElement;
            const emCampo =
                elemento.isContentEditable ||
                ["INPUT", "TEXTAREA", "SELECT"].includes(elemento.tagName);

            if (e.key === "Escape") {
                if (menu) {
                    setMenu(null);
                    return;
                }
                if (emCampo || visualizando) return;
                if (document.querySelector("[data-painel-filtros]")) return;

                limparSelecao();
                return;
            }

            if (e.key !== "Delete") return;
            if (visualizando || emCampo) return;
            if (!selectedMedia && selecionadas.size === 0) return;
            if (document.querySelector("[data-painel-filtros]")) return;

            e.preventDefault();
            excluirSelecionadas();
        }

        window.addEventListener("click", fecharMenu);
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("click", fecharMenu);
            window.removeEventListener("keydown", handleKeyDown);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMedia, medias, onDeleteMedias, menu, visualizando, selecionadas]);

    function clicarMedia(media: Media, e: React.MouseEvent) {
        setMenu(null);

        const ctrl = e.ctrlKey || e.metaKey;

        // Shift: seleciona o intervalo entre a âncora e a mídia clicada
        if (e.shiftKey) {
            const ancora = ancoraRef.current ?? selectedMedia?.id ?? media.id;
            const a = medias.findIndex((m) => m.id === ancora);
            const b = medias.findIndex((m) => m.id === media.id);
            const [ini, fim] = a < 0 ? [b, b] : [Math.min(a, b), Math.max(a, b)];
            const faixa = medias.slice(ini, fim + 1).map((m) => m.id);

            setSelecionadas((atuais) =>
                new Set(ctrl ? [...atuais, ...faixa] : faixa)
            );
            ancoraRef.current = ancora;
            onSelectMedia(media);
            return;
        }

        // Ctrl: liga/desliga uma mídia
        if (ctrl) {
            const novas = new Set(selecionadas);

            if (novas.size === 0 && selectedMedia) novas.add(selectedMedia.id);

            if (novas.has(media.id)) {
                novas.delete(media.id);
                setSelecionadas(novas);

                if (media.id === selectedMedia?.id) {
                    const restante = [...novas].pop();
                    onSelectMedia(medias.find((m) => m.id === restante) ?? null);
                }
            } else {
                novas.add(media.id);
                setSelecionadas(novas);
                onSelectMedia(media);
            }

            ancoraRef.current = media.id;
            return;
        }

        // Clique simples: seleção única
        setSelecionadas(new Set([media.id]));
        ancoraRef.current = media.id;
        onSelectMedia(media);
    }

    function abrirMenu(media: Media, x: number, y: number) {
        if (!selecionadas.has(media.id)) {
            setSelecionadas(new Set([media.id]));
            ancoraRef.current = media.id;
            onSelectMedia(media);
        }

        setMenu({ x, y });
    }

    function abrirRelacionada(id: string) {
        const alvo = todasMedias.find((m) => m.id === id);

        if (!alvo) return;

        setMenu(null);
        setSelecionadas(new Set([id]));
        ancoraRef.current = id;
        onSelectMedia(alvo);
    }

    const posicao = selectedMedia
        ? medias.findIndex((m) => m.id === selectedMedia.id)
        : -1;

    function abrirVisualizador(media: Media) {
        setMenu(null);
        onSelectMedia(media);
        setVisualizando(true);
    }

    function navegar(delta: number) {
        const destino = medias[posicao + delta];

        if (destino) {
            setSelecionadas(new Set([destino.id]));
            onSelectMedia(destino);
        }
    }

    return (
        <div className="flex min-h-0 flex-1 overflow-hidden">
            <div
                className="min-h-0 min-w-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-5 bg-fundo"
                onDoubleClick={(e) => {
                    const alvo = e.target as HTMLElement;

                    if (alvo.closest("[data-media-card], [data-painel-filtros]")) {
                        return;
                    }

                    limparSelecao();
                }}
            >
                <div className="flex items-start gap-4">
                    {colunas.map((coluna, indice) => (
                        <div key={indice} className="flex min-w-0 flex-1 flex-col gap-4">
                            {coluna.map((media) => (
                                <MediaCard
                                    key={media.id}
                                    media={media}
                                    onOpen={abrirVisualizador}
                                    onSelectMedia={clicarMedia}
                                    onContextMenu={abrirMenu}
                                    selected={
                                        multiplas
                                            ? selecionadas.has(media.id)
                                            : selectedMedia?.id === media.id
                                    }
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {visualizando && selectedMedia && (
                <MediaViewer
                    media={selectedMedia}
                    posicao={posicao}
                    total={medias.length}
                    onNavegar={navegar}
                    onClose={() => setVisualizando(false)}
                />
            )}

            <MediaInfo
                media={selectedMedia}
                onOpenViewer={() => selectedMedia && setVisualizando(true)}
                allTags={allTags}
                onAddTag={onAddTag}
                onRemoveTag={onRemoveTag}
                onDeleteTag={onDeleteTag}
                onCustomizeTag={onCustomizeTag}
                onCreateCategory={onCreateCategory}
                onRenameMedia={onRenameMedia}
                onChangeAutoTags={onChangeAutoTags}
                todasMedias={todasMedias}
                onSetPrevious={onSetPrevious}
                onOpenRelated={abrirRelacionada}
                onDurationKnown={onDurationKnown}
            />

            {menu && (
                <div
                    className="fixed z-50 min-w-48 rounded-md bg-base p-1 shadow-lg"
                    style={{ left: menu.x, top: menu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        className="w-full rounded px-3 py-2 text-left text-white hover:bg-botao"
                        onClick={() => {
                            setMenu(null);
                            setMarcandoTag(true);
                        }}
                    >
                        Adicionar tag em {quantidade} {quantidade === 1 ? "mídia" : "mídias"}
                    </button>

                    <button
                        className="w-full rounded px-3 py-2 text-left text-red-400 hover:bg-botao"
                        onClick={excluirSelecionadas}
                    >
                        Excluir {quantidade === 1 ? "mídia" : `${quantidade} mídias`}
                    </button>
                </div>
            )}

            {marcandoTag && (
                <BatchTagModal
                    quantidade={quantidade}
                    allTags={allTags}
                    onClose={() => setMarcandoTag(false)}
                    onConfirm={(nome) => {
                        onAddTagToMany([...selecionadas], nome);
                        setMarcandoTag(false);
                    }}
                />
            )}
        </div>
    );
}

export default Mediagrid;