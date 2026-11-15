import { useEffect, useRef, useState } from "react";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import type { Media } from "./types/media";
import { obterArquivoCacheado } from "../lib/cache";
import VideoPlayer from "./VideoPlayer";

type MediaViewerProps = {
  media: Media;
  posicao: number; // índice na lista filtrada (-1 se não estiver nela)
  total: number;
  onNavegar: (delta: number) => void;
  onClose: () => void;
  permitirRecuarNoInicio?: boolean;
  permitirAvancarNoFim?: boolean;
};

const ZOOM_DUPLO_CLIQUE = 2.5;
const ZOOM_MAX = 8;
const ZOOM_INICIAL = { s: 1, x: 0, y: 0 };

function MediaViewer({
  media,
  posicao,
  total,
  onNavegar,
  onClose,
  permitirAvancarNoFim,
  permitirRecuarNoInicio,
}: MediaViewerProps) {
  // Miniatura mostrada enquanto o original ainda carrega
  const [previa, setPrevia] = useState("");

  // Zoom (s) e deslocamento (x, y) da imagem, em pixels da tela
  const [zoom, setZoom] = useState(ZOOM_INICIAL);
  const [arrastando, setArrastando] = useState(false);
  const arrasto = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null
  );
  const overlayRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const zoomado = zoom.s > 1;
  const ehVideo = media.mimeType?.startsWith("video/");

  // Trocou de mídia: volta ao tamanho normal
  useEffect(() => {
    setZoom(ZOOM_INICIAL);
    setArrastando(false);
    arrasto.current = null;
  }, [media.id]);

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

        // Com zoom, o primeiro Esc só volta ao normal
        if (zoomado) setZoom(ZOOM_INICIAL);
        else onClose();
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
  }, [onNavegar, onClose, zoomado]);

  // Impede arrastar a imagem para fora da tela (sempre sobra parte dela visível)
  function limitarPosicao(s: number, x: number, y: number) {
    const img = imgRef.current;
    const caixa = overlayRef.current?.getBoundingClientRect();

    if (!img || !caixa) return { s, x, y };

    const maxX = Math.max(0, (img.offsetWidth * s - caixa.width) / 2);
    const maxY = Math.max(0, (img.offsetHeight * s - caixa.height) / 2);

    return {
      s,
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  }

  // Muda o zoom mantendo o ponto sob o cursor no mesmo lugar
  function zoomarEm(
    clientX: number,
    clientY: number,
    novoZoom: (atual: number) => number
  ) {
    const caixa = overlayRef.current?.getBoundingClientRect();

    if (!caixa) return;

    const px = clientX - (caixa.left + caixa.width / 2);
    const py = clientY - (caixa.top + caixa.height / 2);

    setZoom((atual) => {
      const s = Math.min(ZOOM_MAX, novoZoom(atual.s));

      if (s <= 1) return ZOOM_INICIAL;

      const razao = s / atual.s;

      return limitarPosicao(
        s,
        px - (px - atual.x) * razao,
        py - (py - atual.y) * razao
      );
    });
  }

  function aoDarDuploClique(e: React.MouseEvent) {
    e.stopPropagation();

    if (zoomado) setZoom(ZOOM_INICIAL);
    else zoomarEm(e.clientX, e.clientY, () => ZOOM_DUPLO_CLIQUE);
  }

  function aoRolar(e: React.WheelEvent) {
    if (ehVideo) return;

    const fator = e.deltaY < 0 ? 1.15 : 1 / 1.15;

    zoomarEm(e.clientX, e.clientY, (s) => s * fator);
  }

  function aoPressionar(e: React.PointerEvent<HTMLImageElement>) {
    if (!zoomado || e.button !== 0) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    arrasto.current = { x: e.clientX, y: e.clientY, ox: zoom.x, oy: zoom.y };
    setArrastando(true);
  }

  function aoMover(e: React.PointerEvent<HTMLImageElement>) {
    const a = arrasto.current;

    if (!a) return;

    setZoom((atual) =>
      limitarPosicao(
        atual.s,
        a.ox + e.clientX - a.x,
        a.oy + e.clientY - a.y
      )
    );
  }

  function aoSoltar(e: React.PointerEvent<HTMLImageElement>) {
    if (!arrasto.current) return;

    arrasto.current = null;
    setArrastando(false);

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  const temAnterior = posicao > 0 || !!permitirRecuarNoInicio;
  const temProxima =
    (posicao >= 0 && posicao < total - 1) || !!permitirAvancarNoFim;
  const origem = media.src || previa;

  const classeSeta =
    "absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-base/50 p-4 text-white hover:bg-base/80 disabled:hidden";

  return (
    <div
      ref={overlayRef}
      data-painel-filtros
      className="fixed inset-0 z-[150] flex items-center justify-center overflow-hidden bg-fundo/90"
      onClick={onClose}
      onWheel={aoRolar}
    >
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between gap-4 p-4 text-white">
        <span className="min-w-0 truncate font-Alexandria font-[500]">
          {posicao >= 0 && (
            <span className="ml-3 text-sm text-gray-300">
              {posicao + 1} / {total}
            </span>
          )}

          {zoomado && (
            <span className="ml-3 text-sm text-gray-300">
              {Math.round(zoom.s * 100)}%
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
       <VideoPlayer
          key={media.id}
          src={media.src || undefined}
          poster={previa || undefined}
          autoPlay
          atalhos
          arredondado={false}
          style={
            media.width && media.height
              ? {
                  aspectRatio: `${media.width} / ${media.height}`,
                  width: `min(90vw, calc(90vh * ${media.width} / ${media.height}))`,
                }
              : { width: "90vw", height: "90vh" }
          }
          videoClassName="absolute inset-0 h-full w-full object-contain"
        />
      ) : origem ? (
        <img
          ref={imgRef}
          key={media.id}
          src={origem}
          alt={media.name}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={aoDarDuploClique}
          onPointerDown={aoPressionar}
          onPointerMove={aoMover}
          onPointerUp={aoSoltar}
          onPointerCancel={aoSoltar}
          style={{
            transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.s})`,
            transition: arrastando ? "none" : "transform 150ms ease-out",
            cursor: zoomado ? (arrastando ? "grabbing" : "grab") : "zoom-in",
          }}
          className="max-h-[90vh] max-w-[90vw] touch-none select-none object-contain"
        />
      ) : null}
    </div>
  );
}

export default MediaViewer;