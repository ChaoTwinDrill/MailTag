
import { useEffect, useRef, useState } from "react";
import type { Media } from "./types/media";
import { obterArquivoCacheado } from "../lib/cache";

interface MediaCardProps {
    media: Media;
    onSelectMedia: (media: Media | null) => void;
    onContextMenu: (media: Media, x: number, y: number) => void;
    selected: boolean;
}

function MediaCard({
    media,
    onSelectMedia,
    onContextMenu,
    selected
}: MediaCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [imagem, setImagem] = useState(media.thumbnailSrc);

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

    return (
        <div
            ref={cardRef}
            className={`overflow-hidden rounded-lg bg-card cursor-pointer ${
                selected
                    ? "outline outline-4 outline-purple-200 outline-offset brightness-69"
                    : ""
            }`}
            onClick={() => onSelectMedia(media)}
            onContextMenu={(e) => {
                e.preventDefault();
                onContextMenu(media, e.clientX, e.clientY);
            }}
        >
            {imagem ? (
                <img
                    src={imagem}
                    alt={media.name}
                    className="w-full object-cover"
                    loading="lazy"
                />
            ) : (
                <div className="w-full aspect-square bg-card" />
            )}
        </div>
    );
}

export default MediaCard;
