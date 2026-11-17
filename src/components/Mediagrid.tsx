import { useEffect, useState, useMemo, useRef } from "react";
import type { Media } from "./types/media";
import MediaCard from "./Mediacard";
import MediaInfo from "./MediaInfo";
import type { tags } from "./types/tag";
import MediaViewer from "./MediaViewer";
import BatchTagModal from "./BatchTagModal";
import type { PedidoAleatorio } from "../lib/aleatorio";

// Largura mínima de cada coluna; o número de colunas acompanha a janela
const LARGURA_MIN_COLUNA = 200;
const ESPACO_ENTRE_COLUNAS = 16;
const MIN_COLUNAS = 4;
const MAX_COLUNAS = 4;

type MediagridProps = {
    medias: Media[];
    todasMedias: Media[];
    pedidoAleatorio: PedidoAleatorio | null;
    onCopyTags: (mediaId: string) => void;
    onPasteTags: (mediaIds: string[]) => void;
    copiedTagCount: number;
    onSearchTag?: (tagId: string, excluir: boolean) => void;
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
    onSearchTag,
    onChangeAutoTags,
    onDurationKnown,
    onRenameMedia,
    onCopyTags,
    onPasteTags,
    copiedTagCount,
    pedidoAleatorio,
}: MediagridProps) {
    const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
    const [visualizando, setVisualizando] = useState(false);
    const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
    const [marcandoTag, setMarcandoTag] = useState(false);
    const ancoraRef = useRef<string | null>(null);
    const rolagemRef = useRef<HTMLDivElement>(null);
    const [numColunas, setNumColunas] = useState(4);

    useEffect(() => {
        const el = rolagemRef.current;

        if (!el) return;

        function calcular() {
            if (!el) return;

            const estilo = getComputedStyle(el);
            const largura =
                el.clientWidth -
                parseFloat(estilo.paddingLeft) -
                parseFloat(estilo.paddingRight);

            const n = Math.floor(
                (largura + ESPACO_ENTRE_COLUNAS) /
                    (LARGURA_MIN_COLUNA + ESPACO_ENTRE_COLUNAS)
            );

            setNumColunas(Math.min(MAX_COLUNAS, Math.max(MIN_COLUNAS, n)));
        }

        calcular();

        const observer = new ResizeObserver(calcular);
        observer.observe(el);

        return () => observer.disconnect();
    }, []);

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

    const ultimoPedido = useRef(pedidoAleatorio?.n ?? 0);

        useEffect(() => {
        if (!pedidoAleatorio || pedidoAleatorio.n === ultimoPedido.current) return;

        ultimoPedido.current = pedidoAleatorio.n;

        const alvo = medias.find((m) => m.id === pedidoAleatorio.id);

        if (!alvo) return;

        setMenu(null);
        setSelecionadas(new Set([alvo.id]));
        ancoraRef.current = alvo.id;
        onSelectMedia(alvo);

        if (pedidoAleatorio.abrir) setVisualizando(true);

        document
            .querySelector(`[data-media-id="${alvo.id}"]`)
            ?.scrollIntoView({ block: "center", behavior: "smooth" });
        }, [pedidoAleatorio]);

    const colunas = useMemo(() => {
        const resultado: Media[][] = Array.from(
            { length: numColunas },
            () => []
        );

        medias.forEach((media, indice) => {
            resultado[indice % numColunas].push(media);
        });

        return resultado;
    }, [medias, numColunas]);

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
    const [anteriorSeq, proximaSeq] =
    visualizando && selectedMedia
        ? [
            selectedMedia.previousMediaId
            ? todasMedias.find((m) => m.id === selectedMedia.previousMediaId) ?? null
            : null,
            todasMedias.find((m) => m.previousMediaId === selectedMedia.id) ?? null,
        ]
        : [null, null];
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
                ref={rolagemRef}
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
                    sequenciaAnterior={anteriorSeq && { id: anteriorSeq.id, nome: anteriorSeq.name }}
                    sequenciaProxima={proximaSeq && { id: proximaSeq.id, nome: proximaSeq.name }}
                    onIrParaSequencia={abrirRelacionada}
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
                onSearchTag={onSearchTag}
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
                    className="fixed z-50 min-w-48 animate-fade-in rounded-md bg-base p-1 shadow-lg"
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
                    {quantidade === 1 && (alvos[0]?.tags.length ?? 0) > 0 && (
                    <button
                        className="w-full rounded px-3 py-2 text-left text-white hover:bg-botao"
                        onClick={() => {
                        setMenu(null);
                        onCopyTags(alvos[0].id);
                        }}
                    >
                        Copiar tags
                    </button>
                    )}

                    {copiedTagCount > 0 && (
                    <button
                        className="w-full rounded px-3 py-2 text-left text-white hover:bg-botao"
                        onClick={() => {
                        setMenu(null);
                        onPasteTags(alvos.map((m) => m.id));
                        }}
                    >
                        Colar {copiedTagCount} {copiedTagCount === 1 ? "tag" : "tags"}
                        {quantidade > 1 ? ` em ${quantidade}` : ""}
                    </button>
                    )}
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