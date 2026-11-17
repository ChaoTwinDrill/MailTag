import { useEffect, useRef, useState, type ReactNode } from "react";
import { FaBook } from "react-icons/fa";
import { obterArquivoCacheado } from "../lib/cache";

type CapaLivroProps = {
  // Miniatura a baixar quando a capa aparece na tela
  chave?: string | null;
  // Ou uma imagem que o pai já carregou (tem prioridade sobre a baixada)
  src?: string;
  titulo: string;
  // Define o tamanho, ex.: "aspect-[3/4] w-full" ou "h-16 w-12"
  className?: string;
  // Selos por cima da capa (nº de páginas, check de seleção...)
  children?: ReactNode;
};

// Capa de livro: lombada, brilho suave, carregamento com fade e,
// quando o livro não tem capa, um cartão com ícone e título.
export default function CapaLivro({
  chave,
  src,
  titulo,
  className = "",
  children,
}: CapaLivroProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [baixada, setBaixada] = useState("");
  const [falhou, setFalhou] = useState(false);
  const [pronta, setPronta] = useState(false);

  useEffect(() => {
    setBaixada("");
    setFalhou(false);
    setPronta(false);

    if (!chave) return;

    let cancelado = false;

    const observer = new IntersectionObserver(
      (entradas) => {
        if (!entradas.some((e) => e.isIntersecting)) return;

        observer.disconnect();

        obterArquivoCacheado(chave)
          .then((s) => {
            if (!cancelado) setBaixada(s);
          })
          .catch(() => {
            if (!cancelado) setFalhou(true);
          });
      },
      { rootMargin: "300px" }
    );

    if (ref.current) observer.observe(ref.current);

    return () => {
      cancelado = true;
      observer.disconnect();
    };
  }, [chave]);

  const imagem = src || baixada;
  const semCapa = (!chave && !src) || (falhou && !imagem);

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden rounded-l-sm rounded-r-lg bg-card shadow-md shadow-black/40 ${className}`}
    >
      {imagem && (
        <img
          src={imagem}
          alt={titulo}
          decoding="async"
          onLoad={() => setPronta(true)}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            pronta ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {semCapa && (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-botao to-base p-3 text-center">
          <FaBook className="h-1/4 w-1/4 max-h-8 max-w-8 text-white/40" />
          <span className="line-clamp-4 break-words font-Alexandria text-[11px] font-[500] leading-tight text-white/80">
            {titulo}
          </span>
        </div>
      )}

      {!semCapa && !pronta && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent bg-[length:200%_100%]"
        />
      )}

      {/* Lombada */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[7%] bg-gradient-to-r from-black/40 via-black/10 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-[7%] w-px bg-white/20"
      />

      {/* Brilho */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20"
      />

      {children}
    </div>
  );
}