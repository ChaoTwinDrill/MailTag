import {useEffect,  useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent,} from "react";
import {FaExpand, FaPause, FaPlay, FaVolumeDown, FaVolumeMute, FaVolumeUp,} from "react-icons/fa";
import { formatarDuracao } from "../lib/duracao";
import {assinarPreferenciaVolume, lerPreferenciaVolume,salvarPreferenciaVolume,} from "../lib/videPrefs";

type VideoPlayerProps = {
  src?: string;
  poster?: string;
  arredondado?: boolean;
  autoPlay?: boolean;
  atalhos?: boolean; 
  className?: string;
  videoClassName?: string;
  onExpandir?: () => void;
  onMetadata?: (duracao: number) => void;
  style?: CSSProperties;
};

const VELOCIDADES = [0.5, 1, 1.25, 1.5, 2];

let tocandoAgora: HTMLVideoElement | null = null;

function Barra({
  valor,
  onChange,
  className = "",
}: {
  valor: number;
  onChange: (valor: number) => void;
  className?: string;
}) {
  function calcular(e: ReactPointerEvent<HTMLDivElement>) {
    const caixa = e.currentTarget.getBoundingClientRect();

    return Math.min(1, Math.max(0, (e.clientX - caixa.left) / caixa.width));
  }

  return (
    <div
      className={`group relative flex h-5 cursor-pointer touch-none items-center ${className}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onChange(calcular(e));
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          onChange(calcular(e));
        }
      }}
      onPointerUp={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      }}
    >
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/25 transition-all group-hover:h-1.5">
        <div
          className="h-full bg-botao-claro"
          style={{ width: `${valor * 100}%` }}
        />
      </div>

      <div
        className="absolute h-3 w-3 -translate-x-1/2 rounded-full bg-botao-claro opacity-0 shadow group-hover:opacity-100"
        style={{ left: `${valor * 100}%` }}
      />
    </div>
  );
}

export default function VideoPlayer({
  src,
  poster,
  style,
  autoPlay,
  atalhos,
  arredondado = true,
  className = "",
  videoClassName = "",
  onExpandir,
  onMetadata,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | null>(null);
  const sobreControles = useRef(false);

  const [tocando, setTocando] = useState(false);
  const [tempo, setTempo] = useState(0);
  const [duracao, setDuracao] = useState(0);
  const [volume, setVolume] = useState(() => lerPreferenciaVolume().volume);
  const [mudo, setMudo] = useState(() => lerPreferenciaVolume().mudo);
  const [velocidade, setVelocidade] = useState(1);
  const [ativo, setAtivo] = useState(true);

  const visivel = ativo || !tocando;

  useEffect(() => {
    const v = videoRef.current;

    if (!v) return;

    function aplicar() {
      const p = lerPreferenciaVolume();

      if (v && Math.abs(v.volume - p.volume) > 0.001) v.volume = p.volume;
      if (v && v.muted !== p.mudo) v.muted = p.mudo;
    }

    aplicar();

    const cancelar = assinarPreferenciaVolume(aplicar);

    return () => {
      cancelar();

      if (tocandoAgora === v) tocandoAgora = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  function alternar() {
    const v = videoRef.current;

    if (!v) return;

    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }

  function definirVolume(valor: number) {
    const v = videoRef.current;

    if (!v) return;

    v.volume = valor;
    v.muted = valor === 0;
  }

  function alternarMudo() {
    const v = videoRef.current;

    if (!v) return;

    if (v.muted || v.volume === 0) {
      v.muted = false;

      if (v.volume === 0) v.volume = 0.5;
    } else {
      v.muted = true;
    }
  }

  function buscar(razao: number) {
    const v = videoRef.current;

    if (!v || !Number.isFinite(v.duration)) return;

    v.currentTime = razao * v.duration;
    setTempo(v.currentTime);
  }

  function trocarVelocidade() {
    const v = videoRef.current;

    if (!v) return;

    const proxima =
      VELOCIDADES[(VELOCIDADES.indexOf(velocidade) + 1) % VELOCIDADES.length];

    v.playbackRate = proxima;
    setVelocidade(proxima);
  }

  function mostrarControles() {
    setAtivo(true);

    if (timerRef.current !== null) window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(() => {
      const v = videoRef.current;

      if (v && !v.paused && !sobreControles.current) setAtivo(false);
    }, 2500);
  }

  function aoTocar() {
    const v = videoRef.current;

    if (!v) return;

    if (tocandoAgora && tocandoAgora !== v) tocandoAgora.pause();

    tocandoAgora = v;
    setTocando(true);
    mostrarControles();
  }

  function aoMudarVolume() {
    const v = videoRef.current;

    if (!v) return;

    setVolume(v.volume);
    setMudo(v.muted);

    const p = lerPreferenciaVolume();

    if (Math.abs(p.volume - v.volume) > 0.001 || p.mudo !== v.muted) {
      salvarPreferenciaVolume(v.volume, v.muted);
    }
  }

  function atualizarDuracao() {
    const v = videoRef.current;

    if (v && Number.isFinite(v.duration)) setDuracao(v.duration);
  }

  function aoCarregarMetadata() {
    const v = videoRef.current;

    if (!v) return;

    atualizarDuracao();

    if (Number.isFinite(v.duration)) onMetadata?.(v.duration);
  }

  useEffect(() => {
    if (!atalhos) return;

    function aoTeclar(e: KeyboardEvent) {
      const alvo = e.target as HTMLElement;

      if (
        alvo.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName)
      ) {
        return;
      }

      const v = videoRef.current;

      if (!v) return;

      if (e.code === "Space") {
        if (alvo.tagName === "BUTTON") alvo.blur();

        e.preventDefault();
        alternar();
      } else if (e.code === "KeyM") {
        alternarMudo();
      } else if (e.code === "ArrowUp") {
        e.preventDefault();
        definirVolume(Math.min(1, v.volume + 0.05));
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        definirVolume(Math.max(0, v.volume - 0.05));
      } else if (e.code === "KeyJ") {
        v.currentTime = Math.max(0, v.currentTime - 5);
      } else if (e.code === "KeyL") {
        v.currentTime = Math.min(v.duration || 0, v.currentTime + 5);
      }
    }

    window.addEventListener("keydown", aoTeclar);

    return () => window.removeEventListener("keydown", aoTeclar);

  }, [atalhos]);

  const IconeVolume =
    mudo || volume === 0 ? FaVolumeMute : volume < 0.5 ? FaVolumeDown : FaVolumeUp;

  const botao = "shrink-0 hover:text-botao-claro";

  return (
    <div
      style={style}
      className={`relative overflow-hidden ${arredondado ? "rounded-lg" : ""} ${
        visivel ? "" : "cursor-none"
      } ${className}`}
      onMouseMove={mostrarControles}
      onMouseLeave={() => {
        const v = videoRef.current;

        if (v && !v.paused) setAtivo(false);
      }}
      // No visualizador, clicar no player não deve fechar o fundo
      onClick={atalhos ? (e) => e.stopPropagation() : undefined}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        preload="metadata"
        playsInline
        onClick={alternar}
        onDoubleClick={onExpandir}
        onPlay={aoTocar}
        onPause={() => setTocando(false)}
        onTimeUpdate={() => setTempo(videoRef.current?.currentTime ?? 0)}
        onLoadedMetadata={aoCarregarMetadata}
        onDurationChange={atualizarDuracao}
        onVolumeChange={aoMudarVolume}
        className={`block ${videoClassName}`}
      />

      {!tocando && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-base/80 text-white shadow-lg">
            <FaPlay className="ml-1 h-5 w-5" />
          </span>
        </div>
      )}

      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-fundo/95 via-fundo/60 to-transparent px-3 pb-2 pt-8 text-white transition-opacity duration-200 ${
          visivel ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onMouseEnter={() => {
          sobreControles.current = true;
        }}
        onMouseLeave={() => {
          sobreControles.current = false;
        }}
        // Não rouba o foco do teclado ao clicar nos controles
        onMouseDown={(e) => e.preventDefault()}
      >
        <Barra
          valor={duracao ? Math.min(1, tempo / duracao) : 0}
          onChange={buscar}
        />

        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            title="Reproduzir/Pausar"
            onClick={alternar}
            className={botao}
          >
            {tocando ? (
              <FaPause className="h-4 w-4" />
            ) : (
              <FaPlay className="h-4 w-4" />
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              title="Mudo"
              onClick={alternarMudo}
              className={botao}
            >
              <IconeVolume className="h-4 w-4" />
            </button>

            <Barra
              className="w-20"
              valor={mudo ? 0 : volume}
              onChange={definirVolume}
            />
          </div>

          <span className="whitespace-nowrap font-Alexandria text-xs tabular-nums">
            {formatarDuracao(tempo)} / {formatarDuracao(duracao)}
          </span>

          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              title="Velocidade"
              onClick={trocarVelocidade}
              className={`${botao} font-Alexandria text-xs font-[700]`}
            >
              {velocidade}x
            </button>

            {onExpandir && (
              <button
                type="button"
                title="Ampliar"
                onClick={onExpandir}
                className={botao}
              >
                <FaExpand className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}