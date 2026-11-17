import { FaTimes } from "react-icons/fa";
import type { tags } from "./types/tag";
import TagSearch from "./TagSearch";

type Props = {
  quantidade: number;
  allTags: tags[];
  onConfirm: (nomeTag: string) => void;
  onClose: () => void;
};

function BatchTagModal({ quantidade, allTags, onConfirm, onClose }: Props) {
  return (
    <div
      data-painel-filtros
      className="fixed inset-0 z-[50] flex animate-fade-in items-center justify-center bg-black/50 p-4 text-white backdrop-blur-sm"
      onClick={onClose}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-md animate-pop rounded-xl bg-base p-5 text-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between text-white">
          <h2
            style={{ color: "#ffffff", WebkitTextFillColor: "#ffffff" }}
            className="font-Alexandria text-white"
          >
            Adicionar tag em {quantidade} {quantidade === 1 ? "mídia" : "mídias"}
          </h2>
          <button type="button" onClick={onClose} className="hover:opacity-60">
            <FaTimes />
          </button>
        </div>

        <TagSearch
          allTags={allTags}
          autoFocus
          alturaMax="max-h-40"
          placeholder="Digite uma tag e tecle Enter..."
          onPick={(tag) => onConfirm(tag.name)}
          onCreate={onConfirm}
          onEscape={onClose}
        />

        <p className="mt-3 text-xs text-gray-300">
          Se a tag não existir, ela será criada.
        </p>
      </div>
    </div>
  );
}

export default BatchTagModal;