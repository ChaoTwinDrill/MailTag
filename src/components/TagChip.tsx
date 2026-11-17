import type { MouseEvent } from "react";
import { FaTimes } from "react-icons/fa";
import type { tags } from "./types/tag";
import { estiloTag } from "../lib/tags";

type TagChipProps = {
  tag: tags;
  tamanho?: "sm" | "md";
  
  // Chip clicável (ex.: sugestão que o usuário escolhe)
  onClick?: (tag: tags, e: MouseEvent) => void;
  // Chip com "x" para remover
  onRemove?: (tag: tags) => void;
  removerTitulo?: string;
  // Clique do meio do mouse (usado para remover nos painéis de info)
  onMiddleClick?: (tag: tags) => void;
  onContextMenu?: (tag: tags, e: MouseEvent) => void;
  // Evita tirar o foco do input ao clicar numa sugestão
  manterFoco?: boolean;
  // Tag excluída da busca: contorno vermelho, "−" e nome riscado
  negada?: boolean;
  className?: string;
};

const TAMANHOS = {
  sm: "px-2 py-1 text-xs font-semibold",
  md: "px-2 py-1 font-semibold",
};

export default function TagChip({
  tag,
  tamanho = "sm",
  onClick,
  onRemove,
  removerTitulo = "Remover",
  onMiddleClick,
  onContextMenu,
  manterFoco,
  negada,
  className = "",
}: TagChipProps) {
  const base = `inline-flex items-center gap-1 rounded ${TAMANHOS[tamanho]} ${
    negada ? "outline outline-2 outline-red-400" : ""
  } ${className}`;

  const conteudo = negada ? (
    <>
      <span className="text-red-300">−</span>
      <span className="line-through decoration-red-400">{tag.name}</span>
    </>
  ) : (
    tag.name
  );

  const comum = {
    // Com o contorno vermelho, a borda própria da tag não é usada
    style: negada ? { ...estiloTag(tag), border: "none" } : estiloTag(tag),
    title: tag.name,
    onContextMenu: onContextMenu
      ? (e: MouseEvent) => {
          e.preventDefault();
          onContextMenu(tag, e);
        }
      : undefined,
    onMouseDown:
      manterFoco || onMiddleClick
        ? (e: MouseEvent) => {
            if (manterFoco) e.preventDefault();

            if (e.button === 1 && onMiddleClick) {
              e.preventDefault();
              onMiddleClick(tag);
            }
            
          }
        : undefined,
  };

  if (onRemove) {
    return (
      <span {...comum} className={base}>
        {conteudo}

        <button
          type="button"
          title={removerTitulo}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(tag);
          }}
          className="hover:opacity-60"
        >
          <FaTimes />
        </button>
      </span>
    );
  }

  if (onClick) {
    return (
      <button
          {...comum}
          type="button"
          onClick={(e) => onClick(tag, e)}
          className={`${base} cursor-pointer transition hover:brightness-125`}
        >
        {conteudo}
      </button>
    );
  }

  return (
    <span
      {...comum}
      className={`${base} ${onContextMenu || onMiddleClick ? "cursor-pointer" : ""}`}
    >
      {conteudo}
    </span>
  );
}