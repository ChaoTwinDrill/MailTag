import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaChevronLeft,
  FaChevronRight,
  FaPause,
  FaPlay,
  FaTimes,
  FaVolumeMute,
  FaVolumeUp,
} from "react-icons/fa";
import type { Media } from "./types/media";
import { obterArquivoCacheado } from "../lib/cache";

export type VizinhoSequencia = { id: string; nome: string };

type MediaViewerProps = {
  media: Media;
  titulo?: string; // ex.: nome do livro (senão usa o nome da mídia)
  posicao: number; // índice na lista filtrada (-1 se não estiver nela)
  total: number;
  onNavegar: (delta: number) => void;
  onClose: () => void;
  permitirRecuarNoInicio?: boolean;
  permitirAvancarNoFim?: boolean;
  sequenciaAnterior?: VizinhoSequencia | null;
  sequenciaProxima?: VizinhoSequencia | null;
  onIrParaSequencia?: (id: string) => void;
};

const ZOOM_DUPLO_CLIQUE = 2.5;
const ZOOM_MAX = 8;
const ZOOM_INICIAL = { s: 1, x: 0, y: 0 };
const ATRASO_CLIQUE_MS = 250; // espera para saber se vem um segundo clique
const LIMITE_ARRASTO_PX = 4; // abaixo disso é clique, não arrasto
const OCIOSO_MS = 2500; // sem mexer o mouse, os controles somem

function formatarTempo(segundos: number) {
  if (!Number.isFinite(segundos) || segundos < 0) return "0:00";

  const total = Math.floor(segundos);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");

  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

function Carregando({ texto }: { texto?: string }) {
  return (
    <div className="pointer-events-none flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-sm text-white ring-1 ring-white/10">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      {texto && <span>{texto}</span>}
    </div>
  );
}

function MediaViewer({
  media,
  titulo,
  posicao,
  total,
  onNavegar,
  onClose,
  permitirAvancarNoFim,
  permitirRecuarNoInicio,
  sequenciaAnterior,
  sequenciaProxima,
  onIrParaSequencia,
}: MediaViewerProps) {
  // Miniatura mostrada enquanto o original ainda carrega
  const [previa, setPrevia] = useState("");

  // Zoom (s) e deslocamento (x, y) da mídia, em pixels da tela
  const [zoom, setZoom] = useState(ZOOM_INICIAL);
  const [arrastando, setArrastando] = useState(false);

  // Estado do player de vídeo
  const [tocando, setTocando] = useState(false);
  const [tempo, setTempo] = useState(0);
  const [duracao, setDuracao] = useState(0);
  const [volume, setVolume] = useState(1);
  const [mudo, setMudo] = useState(false);

  // Controles visíveis (somem com o mouse parado)
  const [ativo, setAtivo] = useState(true);

  const arrasto = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null
  );
  const moveu = useRef(false);
  const cliqueTimer = useRef<number | null>(null);
  const ocioso = useRef<number | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const zoomado = zoom.s > 1;
  const ehVideo = !!media.mimeType?.startsWith("video/");
  const mostrar = ativo || (ehVideo && !tocando);

  // Aparece/some com transição; escondido, não recebe cliques
  const fade = `transition duration-300 ${
    mostrar ? "opacity-100" : "pointer-events-none opacity-0"
  }`;

  function acordar() {
    setAtivo(true);

    if (ocioso.current !== null) window.clearTimeout(ocioso.current);

    ocioso.current = window.setTimeout(() => setAtivo(false), OCIOSO_MS);
  }

  // Trocou de mídia: volta ao tamanho normal, zera o player e mostra os controles
  useEffect(() => {
    setZoom(ZOOM_INICIAL);
    setArrastando(false);
    setTocando(false);
    setTempo(0);
    setDuracao(0);
    arrasto.current = null;
    moveu.current = false;

    if (cliqueTimer.current !== null) {
      window.clearTimeout(cliqueTimer.current);
      cliqueTimer.current = null;
    }

    acordar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media.id]);

  useEffect(
    () => () => {
      if (cliqueTimer.current !== null) window.clearTimeout(cliqueTimer.current);
      if (ocioso.current !== null) window.clearTimeout(ocioso.current);
    },
    []
  );

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

  // ---------- Player ----------

  function alternarReproducao() {
    const el = videoRef.current;

    if (!el) return;

    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }

  function alternarMudo() {
    const el = videoRef.current;

    if (!el) return;

    const novo = !el.muted;

    el.muted = novo;
    setMudo(novo);
  }

  function mudarVolume(valor: number) {
    const el = videoRef.current;

    setVolume(valor);
    setMudo(valor === 0);

    if (el) {
      el.volume = valor;
      el.muted = valor === 0;
    }
  }

  function buscarPara(segundos: number) {
    const el = videoRef.current;

    if (!el || !Number.isFinite(el.duration)) return;

    el.currentTime = Math.min(Math.max(segundos, 0), el.duration);
    setTempo(el.currentTime);
  }

  // Captura as teclas antes dos atalhos do resto do app
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      acordar();

      if (e.key === "Escape") {
        e.stopPropagation();

        // Com zoom, o primeiro Esc só volta ao normal
        if (zoomado) setZoom(ZOOM_INICIAL);
        else onClose();
      } else if (ehVideo && e.code === "Space") {
        e.stopPropagation();
        e.preventDefault();
        alternarReproducao();
      } else if (ehVideo && e.code === "KeyM") {
        e.stopPropagation();
        e.preventDefault();
        alternarMudo();
      } else if (e.ctrlKey && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        // Ctrl + setas: anterior / continuação na sequência
        e.stopPropagation();
        e.preventDefault();

        const alvo = e.key === "ArrowRight" ? sequenciaProxima : sequenciaAnterior;

        if (alvo) onIrParaSequencia?.(alvo.id);
      } else if (
        ehVideo &&
        e.shiftKey &&
        (e.key === "ArrowRight" || e.key === "ArrowLeft")
      ) {
        // Shift + setas: avança ou volta 5 segundos
        e.stopPropagation();
        e.preventDefault();

        const el = videoRef.current;

        if (el) buscarPara(el.currentTime + (e.key === "ArrowRight" ? 5 : -5));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    onNavegar,
    onClose,
    zoomado,
    ehVideo,
    sequenciaAnterior,
    sequenciaProxima,
    onIrParaSequencia,
  ]);

  // ---------- Zoom e arrasto ----------

  // Impede arrastar a mídia para fora da tela (sempre sobra parte dela visível)
  function limitarPosicao(s: number, x: number, y: number) {
    const el = ehVideo ? videoRef.current : imgRef.current;
    const caixa = overlayRef.current?.getBoundingClientRect();

    if (!el || !caixa) return { s, x, y };

    const maxX = Math.max(0, (el.offsetWidth * s - caixa.width) / 2);
    const maxY = Math.max(0, (el.offsetHeight * s - caixa.height) / 2);

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

    // Cancela o play/pause que o primeiro clique do duplo clique agendou
    if (cliqueTimer.current !== null) {
      window.clearTimeout(cliqueTimer.current);
      cliqueTimer.current = null;
    }

    if (zoomado) setZoom(ZOOM_INICIAL);
    else zoomarEm(e.clientX, e.clientY, () => ZOOM_DUPLO_CLIQUE);
  }

  // Clique simples no vídeo: play/pause (se não foi um arrasto)
  function aoClicarVideo(e: React.MouseEvent) {
    e.stopPropagation();

    if (moveu.current) {
      moveu.current = false;
      return;
    }

    if (cliqueTimer.current !== null) window.clearTimeout(cliqueTimer.current);

    cliqueTimer.current = window.setTimeout(() => {
      cliqueTimer.current = null;
      alternarReproducao();
    }, ATRASO_CLIQUE_MS);
  }

  function aoRolar(e: React.WheelEvent) {
    const fator = e.deltaY < 0 ? 1.15 : 1 / 1.15;

    zoomarEm(e.clientX, e.clientY, (s) => s * fator);
  }

  function aoPressionar(e: React.PointerEvent<HTMLElement>) {
    if (e.button !== 0) return;

    moveu.current = false;

    if (!zoomado) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    arrasto.current = { x: e.clientX, y: e.clientY, ox: zoom.x, oy: zoom.y };
    setArrastando(true);
  }

  function aoMover(e: React.PointerEvent<HTMLElement>) {
    const a = arrasto.current;

    if (!a) return;

    if (Math.hypot(e.clientX - a.x, e.clientY - a.y) > LIMITE_ARRASTO_PX) {
      moveu.current = true;
    }

    setZoom((atual) =>
      limitarPosicao(atual.s, a.ox + e.clientX - a.x, a.oy + e.clientY - a.y)
    );
  }

  function aoSoltar(e: React.PointerEvent<HTMLElement>) {
    if (!arrasto.current) return;

    arrasto.current = null;
    setArrastando(false);

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  // ---------- Render ----------

  const temAnterior = posicao > 0 || !!permitirRecuarNoInicio;
  const temProxima =
    (posicao >= 0 && posicao < total - 1) || !!permitirAvancarNoFim;
  const origem = media.src || previa;

  const classeSeta = `${fade} absolute top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white ring-1 ring-white/10 backdrop-blur-sm hover:bg-black/60 disabled:hidden`;

  // Setas menores, logo abaixo das normais, para andar pela sequência
  const classeSeq = `${fade} absolute top-[calc(50%+2rem)] z-10 flex h-8 w-8 items-center justify-center rounded-full bg-botao-claro/20 text-botao-claro ring-1 ring-botao-claro/30 backdrop-blur-sm hover:bg-botao-claro/40`;

  const classePilula =
    "shrink-0 rounded-full bg-black/40 px-2.5 py-0.5 text-xs tabular-nums text-gray-200 ring-1 ring-white/10";

  const estiloMidia: CSSProperties = {
    transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.s})`,
    transition: arrastando ? "none" : "transform 150ms ease-out",
    cursor: !mostrar
      ? "none"
      : zoomado
        ? arrastando
          ? "grabbing"
          : "grab"
        : ehVideo
          ? "pointer"
          : "zoom-in",
  };

  return (
    <div
      ref={overlayRef}
      data-painel-filtros
      className="fixed inset-0 z-[150] flex animate-fade-in items-center justify-center overflow-hidden bg-fundo/90 backdrop-blur-md"
      onClick={onClose}
      onWheel={aoRolar}
      onMouseMove={acordar}
    >
      {/* Progresso no livro / lista */}
      {total > 1 && posicao >= 0 && (
        <div className="absolute inset-x-0 top-0 z-20 h-0.5 bg-white/10">
          <div
            className="h-full bg-botao-claro transition-all duration-200"
            style={{ width: `${((posicao + 1) / total) * 100}%` }}
          />
        </div>
      )}

      <div
        className={`${fade} absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-4 bg-gradient-to-b from-black/60 to-transparent p-4 text-white`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="min-w-0 truncate font-Alexandria font-[500]">
            {titulo ?? media.name}
          </span>

          {posicao >= 0 && (
            <span className={classePilula}>
              {posicao + 1} / {total}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {zoomado && (
            <span className={classePilula}>{Math.round(zoom.s * 100)}%</span>
          )}

          <button
            type="button"
            title="Fechar (Esc)"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 ring-1 ring-white/10 transition hover:bg-black/60"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>
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

      {sequenciaAnterior && onIrParaSequencia && (
        <button
          type="button"
          title={`Antes na sequência: ${sequenciaAnterior.nome} (Ctrl+←)`}
          onClick={(e) => {
            e.stopPropagation();
            onIrParaSequencia(sequenciaAnterior.id);
          }}
          className={`${classeSeq} left-6`}
        >
          <FaAngleDoubleLeft className="h-3.5 w-3.5" />
        </button>
      )}

      {sequenciaProxima && onIrParaSequencia && (
        <button
          type="button"
          title={`Continuação: ${sequenciaProxima.nome} (Ctrl+→)`}
          onClick={(e) => {
            e.stopPropagation();
            onIrParaSequencia(sequenciaProxima.id);
          }}
          className={`${classeSeq} right-6`}
        >
          <FaAngleDoubleRight className="h-3.5 w-3.5" />
        </button>
      )}

      {ehVideo ? (
        <>
          <video
            ref={videoRef}
            key={media.id}
            src={media.src || undefined}
            poster={previa || undefined}
            autoPlay
            playsInline
            onClick={aoClicarVideo}
            onDoubleClick={aoDarDuploClique}
            onPointerDown={aoPressionar}
            onPointerMove={aoMover}
            onPointerUp={aoSoltar}
            onPointerCancel={aoSoltar}
            onPlay={() => setTocando(true)}
            onPause={() => setTocando(false)}
            onTimeUpdate={(e) => setTempo(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => {
              setDuracao(e.currentTarget.duration);

              // Mantém o volume escolhido ao trocar de vídeo
              e.currentTarget.volume = volume;
              e.currentTarget.muted = mudo;
            }}
            style={estiloMidia}
            className="max-h-[85vh] max-w-[90vw] touch-none select-none rounded-lg shadow-2xl shadow-black/60"
          />

          {!media.src && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
              <Carregando texto="Carregando vídeo..." />
            </div>
          )}

          <div
            className={`${fade} absolute inset-x-0 bottom-0 z-10 flex items-center gap-3 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10 text-white`}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              title={tocando ? "Pausar (Espaço)" : "Reproduzir (Espaço)"}
              onClick={alternarReproducao}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
            >
              {tocando ? <FaPause /> : <FaPlay className="ml-0.5" />}
            </button>

            <span className="w-28 shrink-0 text-center text-xs tabular-nums text-gray-200">
              {formatarTempo(tempo)} / {formatarTempo(duracao)}
            </span>

            <input
              type="range"
              min={0}
              max={duracao || 0}
              step={0.1}
              value={Math.min(tempo, duracao || 0)}
              onChange={(e) => buscarPara(Number(e.target.value))}
              className="min-w-0 flex-1 cursor-pointer accent-botao-claro"
            />

            <button
              type="button"
              title="Silenciar (M)"
              onClick={alternarMudo}
              className="shrink-0 p-2 transition hover:opacity-60"
            >
              {mudo || volume === 0 ? <FaVolumeMute /> : <FaVolumeUp />}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={mudo ? 0 : volume}
              onChange={(e) => mudarVolume(Number(e.target.value))}
              className="w-24 shrink-0 cursor-pointer accent-botao-claro"
            />
          </div>
        </>
      ) : origem ? (
        <>
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
            style={estiloMidia}
            className="max-h-[90vh] max-w-[90vw] animate-fade-in touch-none select-none rounded-lg object-contain shadow-2xl shadow-black/60"
          />

          {!media.src && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
              <Carregando texto="Carregando em alta qualidade..." />
            </div>
          )}
        </>
      ) : (
        <Carregando />
      )}
    </div>
  );
}

export default MediaViewer;