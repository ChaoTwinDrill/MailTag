import { useState } from "react";
import type { tags } from "./types/tag";
import TagChip from "./TagChip";
import { acharTagPorNome, sugerirTags } from "../lib/tags";

type TagSearchProps = {
  allTags: tags[];
  // Tags que não devem aparecer nas sugestões (já escolhidas, a própria tag...)
  excluirIds?: string[];
  onPick: (tag: tags) => void;
  // Se informado, Enter com um nome novo chama isto (criar tag).
  // Se não, Enter só escolhe uma tag que já existe.
  onCreate?: (nome: string) => void | Promise<void>;
  onEscape?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  limite?: number;
  alturaMax?: string;
  className?: string;
};

const CLASSE_CAMPO =
  "w-full rounded-md bg-fundo p-2 text-sm text-white outline-none focus:ring-2 focus:ring-botao-claro [color-scheme:dark]";

export default function TagSearch({
  allTags,
  excluirIds = [],
  onPick,
  onCreate,
  onEscape,
  placeholder = "Digite uma tag...",
  autoFocus,
  limite = 20,
  alturaMax = "max-h-32",
  className = CLASSE_CAMPO,
}: TagSearchProps) {
  const [texto, setTexto] = useState("");
  const sugestoes = sugerirTags(allTags, texto, excluirIds, limite);

  function escolher(tag: tags) {
    onPick(tag);
    setTexto("");
  }

  function confirmar() {
    const digitado = texto.trim();

    if (!digitado) return;

    const exata = acharTagPorNome(allTags, digitado);

    if (exata) {
      if (!excluirIds.includes(exata.id)) onPick(exata);
      setTexto("");
      return;
    }

    if (onCreate) {
      void onCreate(digitado);
      setTexto("");
      return;
    }

    if (sugestoes.length === 1) escolher(sugestoes[0]);
  }

  return (
    <div>
      <input
        type="text"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            confirmar();
          }

          if (e.key === "Escape") onEscape?.();
        }}
        className={className}
      />

      {sugestoes.length > 0 && (
        <div className={`mt-2 flex flex-wrap gap-2 overflow-y-auto ${alturaMax}`}>
          {sugestoes.map((tag) => (
            <TagChip key={tag.id} tag={tag} onClick={escolher} manterFoco />
          ))}
        </div>
      )}
    </div>
  );
}
