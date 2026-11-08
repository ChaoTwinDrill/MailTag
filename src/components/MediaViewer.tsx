import { useEffect, useState } from "react";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import type { Media } from "./types/media";
import { obterArquivoCacheado } from "../lib/cache";

type MediaViewerProps = {
  media: Media;
  posicao: number; // índice na lista filtrada (-1 se não estiver nela)
  total: number;
  onNavegar: (delta: number) => void;
  onClose: () => void;
};

function MediaViewer({
  media,
  posicao,
  total,
  onNavegar,
  onClose,
}: MediaViewerProps) {
  // Miniatura mostrada enquanto o original ainda carrega
  const [previa, setPrevia] = useState("");

  useEffect(() => {
    setPrevia("");

    if (!media.thumbnailR2Key) return;

    let cancelado = false;

    obterArquivoCacheado(media.thumbnailR2Key)
      .then((src) => {
        if (!cancelado) setPrevia(src);
      })
      .catch(() => {});

    return () => {
      cancelado = true;
    };
  }, [media.id, media.thumbnailR2Key]);

  // Captura as teclas antes dos atalhos do resto do app
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      } else if (e.key === "ArrowRight" || e.code === "KeyD") {
        e.stopPropagation();
        e.preventDefault();
        onNavegar(1);
      } else if (e.key === "ArrowLeft" || e.code === "KeyA") {
        e.stopPropagation();
        e.preventDefault();
        onNavegar(-1);
      }
    }

    window.addEventListener("keydown", aoTeclar, true);

    return () => window.removeEventListener("keydown", aoTeclar, true);
  }, [onNavegar, onClose]);

  const temAnterior = posicao > 0;
  const temProxima = posicao >= 0 && posicao < total - 1;
  const ehVideo = media.mimeType?.startsWith("video/");
  const origem = media.src || previa;

  const classeSeta =
    "absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-base/50 p-4 text-white hover:bg-base/80 disabled:hidden";

  return (
    <div
      data-painel-filtros
      className="fixed inset-0 z-[150] flex items-center justify-center bg-fundo/90"
      onClick={onClose}
    >
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between gap-4 p-4 text-white">
        <span className="min-w-0 truncate font-Alexandria font-[500]">
          {posicao >= 0 && (
            <span className="ml-3 text-sm text-gray-300">
              {posicao + 1} / {total}
            </span>
          )}
        </span>

        <button
          type="button"
          title="Fechar (Esc)"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="shrink-0 hover:opacity-60"
        >
          <FaTimes className="h-6 w-6" />
        </button>
      </div>

      <button
        type="button"
        title="Anterior (←)"
        disabled={!temAnterior}
        onClick={(e) => {
          e.stopPropagation();
          onNavegar(-1);
        }}
        className={`${classeSeta} left-4`}
      >
        <FaChevronLeft />
      </button>

      <button
        type="button"
        title="Próxima (→)"
        disabled={!temProxima}
        onClick={(e) => {
          e.stopPropagation();
          onNavegar(1);
        }}
        className={`${classeSeta} right-4`}
      >
        <FaChevronRight />
      </button>

      {ehVideo ? (
        <video
          key={media.id}
          src={media.src || undefined}
          poster={previa || undefined}
          controls
          autoPlay
          onClick={(e) => e.stopPropagation()}
          className="max-h-[90vh] max-w-[90vw]"
        />
      ) : origem ? (
        <img
          key={media.id}
          src={origem}
          alt={media.name}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[90vh] max-w-[90vw] object-contain"
        />
      ) : null}
    </div>
  );
}

export default MediaViewer;