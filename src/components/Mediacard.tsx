
import { useEffect, useRef, useState } from "react";
import type { Media } from "./types/media";
import { obterArquivoCacheado } from "../lib/cache";

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
            className={`overflow-hidden rounded-lg bg-card cursor-pointer ${
                selected
                    ? "outline outline-4 outline-purple-200 brightness-69"
                    : ""
            }`}
            style={proporcao ? { aspectRatio: proporcao } : undefined}
            onClick={(e) => onSelectMedia(media, e)} onDoubleClick={() => onOpen(media)}
            onMouseEnter={iniciarPrefetch}
            onMouseLeave={cancelarPrefetch}
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
                    className={
                        proporcao
                            ? "h-full w-full object-cover"
                            : "w-full object-cover"
                    }
                />
            ) : proporcao ? null : (
                <div className="w-full aspect-square bg-card" />
            )}
        </div>
    );
}

export default MediaCard;
