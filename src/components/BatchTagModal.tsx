import { useState } from "react";
import { FaTimes } from "react-icons/fa";
import type { tags } from "./types/tag";

type Props = {
  quantidade: number;
  allTags: tags[];
  onConfirm: (nomeTag: string) => void;
  onClose: () => void;
};

function BatchTagModal({ quantidade, allTags, onConfirm, onClose }: Props) {
  const [texto, setTexto] = useState("");
  const busca = texto.trim().toLowerCase();

  const sugestoes = busca
    ? allTags.filter((t) => t.name.toLowerCase().includes(busca)).slice(0, 20)
    : [];

  function confirmar(nome?: string) {
    const digitado = (nome ?? texto).trim();
    if (!digitado) return;

    const existente = allTags.find(
      (t) => t.name.toLowerCase() === digitado.toLowerCase()
    );

    onConfirm(existente?.name ?? digitado);
  }

  return (
    <div
      data-painel-filtros
      className="fixed inset-0 z-[50] flex items-center text-white justify-center bg-fundo/40 p-4"
      onClick={onClose}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-md rounded-xl bg-base p-5 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center text-white justify-between">
          <h2 
          style={{ color: "#ffffff", WebkitTextFillColor: "#ffffff" }}
          className="font-Alexandria text-white">
            Adicionar tag em {quantidade} mídias
          </h2>
          <button type="button" onClick={onClose} className="hover:opacity-60">
            <FaTimes />
          </button>
        </div>

        <input
          autoFocus
          autoComplete="off"
          placeholder="Digite uma tag e tecle Enter..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              confirmar();
            }
            if (e.key === "Escape") onClose();
          }}
          className="w-full rounded-md bg-fundo p-2 text-sm outline-none text-white focus:ring-2 focus:ring-purple-400"
        />

        {sugestoes.length > 0 && (
          <div className="mt-2 flex max-h-40 flex-wrap text-white gap-2 overflow-y-auto">
            {sugestoes.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => confirmar(tag.name)}
                className="rounded px-2 py-1 text-xs text-white font-bold hover:brightness-125"
                style={{
                  backgroundColor: tag.color ?? "#555555",
                  color: tag.textColor ?? "#ffffff",
                  border: tag.hasBorder
                    ? `2px solid ${tag.borderColor ?? "#ffffff"}`
                    : "none",
                }}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}

        <p className="mt-3 text-xs text-gray-300">
          Se a tag não existir, ela será criada.
        </p>
      </div>
    </div>
  );
}

export default BatchTagModal;