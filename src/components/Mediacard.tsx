import { useEffect, useRef, useState } from "react";
import type { Media } from "./types/media";
import { obterArquivoCacheado } from "../lib/cache";
import { FaCheck, FaPlay } from "react-icons/fa";
import { formatarDuracao } from "../lib/duracao";
// Originais de até este tamanho são baixados em segundo plano
// quando o mouse fica sobre o card, para abrirem rápido ao clicar.
const LIMITE_PREFETCH_BYTES = 30 * 1024 * 1024;
const ATRASO_PREFETCH_MS = 250;

interface MediaCardProps {
    media: Media;
    onSelectMedia: (media: Media, e: React.MouseEvent) => void;
    onContextMenu: (media: Media, x: number, y: number) => void;
    selected: boolean;
    onOpen: (media: Media) => void;
    
}

function MediaCard({
    media,
    onSelectMedia,
    onContextMenu,
    selected,
    onOpen,
}: MediaCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const prefetchRef = useRef<number | null>(null);
    const [imagem, setImagem] = useState(media.thumbnailSrc);
    const [pronta, setPronta] = useState(false);
    const eVideo = media.mimeType?.startsWith("video/");
    // Reserva o espaço do card antes da miniatura carregar,
    // evitando que o layout em colunas "pule" durante o scroll.
    const proporcao =
        media.width && media.height
            ? `${media.width} / ${media.height}`
            : null;

    useEffect(() => {
        setImagem(media.thumbnailSrc);

        if (media.thumbnailSrc || !media.thumbnailR2Key) return;

        let cancelado = false;

        const observer = new IntersectionObserver(
            (entradas) => {
                if (entradas.some((entrada) => entrada.isIntersecting)) {
                    observer.disconnect();

                    obterArquivoCacheado(media.thumbnailR2Key!)
                        .then((src) => {
                            if (!cancelado) setImagem(src);
                        })
                        .catch((erro) => {
                            console.error("Erro ao carregar miniatura:", erro);
                        });
                }
            },
            { rootMargin: "300px" }
        );

        if (cardRef.current) observer.observe(cardRef.current);

        return () => {
            cancelado = true;
            observer.disconnect();
        };
    }, [media.thumbnailR2Key, media.thumbnailSrc]);

    useEffect(() => {
        return () => {
            if (prefetchRef.current !== null) {
                window.clearTimeout(prefetchRef.current);
            }
        };
    }, []);

    function iniciarPrefetch() {
        if (media.src || media.size > LIMITE_PREFETCH_BYTES) return;

        prefetchRef.current = window.setTimeout(() => {
            obterArquivoCacheado(media.r2Key).catch(() => {});
        }, ATRASO_PREFETCH_MS);
    }

    function cancelarPrefetch() {
        if (prefetchRef.current !== null) {
            window.clearTimeout(prefetchRef.current);
            prefetchRef.current = null;
        }
    }

    return (
        <div
            ref={cardRef}
            className={`relative cursor-pointer overflow-hidden rounded-lg bg-card transition duration-150 ${
                selected
                    ? "outline outline-4 outline-offset-2 outline-botao-claro"
                    : "hover:brightness-110"
            }`}
            style={proporcao ? { aspectRatio: proporcao } : undefined}
            onClick={(e) => onSelectMedia(media, e)} onDoubleClick={() => onOpen(media)}
            onMouseEnter={iniciarPrefetch}
            onMouseLeave={cancelarPrefetch}
            data-media-card
            data-media-id={media.id}
            onContextMenu={(e) => {
                e.preventDefault();
                onContextMenu(media, e.clientX, e.clientY);
            }}
        >
            {imagem ? (
                <img
                    src={imagem}
                    alt={media.name}
                    decoding="async"
                    onLoad={() => setPronta(true)}
                    className={`${
                        proporcao
                            ? "h-full w-full object-cover"
                            : "w-full object-cover"
                    } transition-opacity duration-300 ${
                        pronta ? "opacity-100" : "opacity-0"
                    }`}
                />
            ) : proporcao ? null : (
                <div className="w-full aspect-square" />
            )}

            {!pronta && (
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent bg-[length:200%_100%]"
                />
            )}

            {selected && (
                <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-botao-claro text-fundo shadow">
                    <FaCheck className="h-3 w-3" />
                </span>
            )}
            {eVideo && (
                <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-xs font-semibold text-white">
                    <FaPlay className="h-2.5 w-2.5" />
                    {media.durationSeconds != null && formatarDuracao(media.durationSeconds)}
                </span>
                )}
        </div>
    );
}

export default MediaCard;