import { FaHistory, FaStar } from "react-icons/fa";
import type { tags } from "./types/tag";
import TagChip from "./TagChip";
import { alternarFavorita, resolverAtalhos, useTagPrefs } from "../lib/tagPrefs";

type Props = {
  allTags: tags[];
  excluirIds: string[];
  onPick: (tag: tags) => void;
};

function Titulo({ icone, texto }: { icone: React.ReactNode; texto: string }) {
  return (
    <h4 className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-300">
      {icone}
      {texto}
    </h4>
  );
}

export default function TagAtalhos({ allTags, excluirIds, onPick }: Props) {
  const prefs = useTagPrefs();
  const { favoritas, recentes } = resolverAtalhos(prefs, allTags, excluirIds);

  if (favoritas.length === 0 && recentes.length === 0) return null;

  return (
    <>
      {favoritas.length > 0 && (
        <section className="mb-2">
          <Titulo icone={<FaStar className="h-2.5 w-2.5 text-yellow-300" />} texto="Favoritas" />

          <div className="flex flex-wrap gap-2">
            {favoritas.map((tag) => (
              <TagChip
                key={tag.id}
                tag={tag}
                tamanho="md"
                manterFoco
                onClick={onPick}
                onContextMenu={(t) => alternarFavorita(t.id)}
              />
            ))}
          </div>
        </section>
      )}

      {recentes.length > 0 && (
        <section className="mb-2">
          <Titulo icone={<FaHistory className="h-2.5 w-2.5" />} texto="Recentes" />

          <div className="flex flex-wrap gap-2">
            {recentes.map((tag) => (
              <TagChip
                key={tag.id}
                tag={tag}
                tamanho="md"
                manterFoco
                onClick={onPick}
                onContextMenu={(t) => alternarFavorita(t.id)}
              />
            ))}
          </div>
        </section>
      )}

      <p className="text-[10px] text-gray-400">
        Botão direito em uma tag: favoritar ou desfavoritar
      </p>
    </>
  );
}